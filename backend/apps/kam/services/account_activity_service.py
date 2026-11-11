"""Account activity: existing commercial evidence and planned KAM actions."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from sales.models import Enterprise
from kam.models import AccountCommercialAction, AccountMemoryEvent, KamAppointment, KamVisitReport


def account_for_user(account_id, user):
    enterprise = get_object_or_404(Enterprise, pk=account_id)
    if user.role == 'KAM' and enterprise.assigned_kam_id != user.pk:
        raise PermissionDenied('Ce compte ne fait pas partie de votre portefeuille.')
    return enterprise


class ActionInputSerializer(serializers.Serializer):
    action_type = serializers.ChoiceField(choices=AccountCommercialAction.TYPES)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=5000, allow_blank=True, default='')
    contact_name = serializers.CharField(max_length=150, allow_blank=True, default='')
    location = serializers.CharField(max_length=255, allow_blank=True, default='')
    scheduled_at = serializers.DateTimeField()
    status = serializers.ChoiceField(choices=['SCHEDULED', 'COMPLETED'], default='SCHEDULED')
    result = serializers.CharField(max_length=5000, allow_blank=True, default='')

    def validate(self, attrs):
        now = timezone.now()
        if attrs['status'] == 'SCHEDULED' and attrs['scheduled_at'] <= now:
            raise serializers.ValidationError('Choisissez une date et une heure à venir pour programmer l’action.')
        if attrs['status'] == 'COMPLETED':
            if attrs['scheduled_at'] > now:
                raise serializers.ValidationError('Une action réalisée ne peut pas être datée dans le futur.')
            if not attrs['result'].strip():
                raise serializers.ValidationError('Précisez le résultat de l’action réalisée.')
        if attrs['status'] == 'SCHEDULED' and attrs['result']:
            raise serializers.ValidationError('Le résultat se renseigne lorsque l’action est réalisée.')
        if attrs['action_type'] == 'VISIT' and not attrs['location'].strip():
            raise serializers.ValidationError('Précisez le lieu de la visite en présentiel.')
        return attrs


def person(user):
    return (user.get_full_name() or user.username) if user else 'Utilisateur supprimé'


def item(key, title, date, author, kind, status, **extra):
    return dict(id=key, title=title, occurred_at=date, author=person(author),
                action_type=kind, status=status, **extra)


def action_state(action):
    if action.appointment_id:
        status = action.appointment.status
        if status in ('COMPLETED', 'CANCELLED', 'IN_PROGRESS'):
            return status
    return action.status


def action_item(action):
    status = action_state(action)
    date = action.scheduled_at if status in ('SCHEDULED', 'IN_PROGRESS') else (
        action.completed_at or (action.appointment.updated_at if action.appointment_id else action.updated_at)
    )
    return item(f'action-{action.pk}', action.title, date, action.completed_by or action.created_by,
                action.get_action_type_display(), status, action_id=action.pk,
                description=action.description, result=action.result, contact_name=action.contact_name,
                scheduled_at=action.scheduled_at, location=action.location,
                appointment_id=action.appointment_id, can_manage=status in ('SCHEDULED', 'IN_PROGRESS'))


def account_activity(enterprise):
    """Merge source records without rewriting or duplicating old visits."""
    history, planned = [], []
    reports = list(KamVisitReport.objects.filter(enterprise=enterprise).select_related('kam', 'appointment').only(
        'id', 'created_at', 'executive_summary', 'kam__username', 'kam__first_name', 'kam__last_name',
        'appointment__title', 'appointment__contact_name',
    ))
    reported = {report.appointment_id for report in reports if report.appointment_id}
    for report in reports:
        appointment = report.appointment
        history.append(item(f'report-{report.pk}', appointment.title if appointment else 'Compte rendu commercial',
                            report.created_at, report.kam, 'Compte rendu', 'COMPLETED',
                            description=report.executive_summary, report_id=report.pk,
                            contact_name=appointment.contact_name if appointment else ''))
    actions = AccountCommercialAction.objects.filter(enterprise=enterprise).select_related('created_by', 'completed_by', 'appointment')
    linked = set()
    for action in actions:
        if action.appointment_id:
            linked.add(action.appointment_id)
        if action.appointment_id in reported:
            continue
        entry = action_item(action)
        (planned if entry['status'] in ('SCHEDULED', 'IN_PROGRESS') else history).append(entry)
    appointments = KamAppointment.objects.filter(enterprise=enterprise).select_related('kam')
    for appointment in appointments:
        if appointment.pk in reported or appointment.pk in linked:
            continue
        status = appointment.status
        entry = item(f'appointment-{appointment.pk}', appointment.title,
                     appointment.scheduled_at if status in ('SCHEDULED', 'IN_PROGRESS') else appointment.updated_at,
                     appointment.kam, 'Rendez-vous', status, description=appointment.objective,
                     contact_name=appointment.contact_name, location=appointment.location,
                     appointment_id=appointment.pk)
        (planned if status in ('SCHEDULED', 'IN_PROGRESS') else history).append(entry)
    events = AccountMemoryEvent.objects.filter(enterprise=enterprise).select_related('created_by')
    for event in events:
        history.append(item(f'memory-{event.pk}', event.summary, event.occurred_at, event.created_by,
                            event.get_event_type_display(), 'RECORDED', description=event.details))
    history.sort(key=lambda entry: (entry['occurred_at'], entry['id']), reverse=True)
    planned.sort(key=lambda entry: (entry['occurred_at'], entry['id']))
    return {'history': history, 'planned': planned}


@transaction.atomic
def create_action(enterprise, user, data):
    serializer = ActionInputSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data
    appointment = None
    if values['action_type'] == 'VISIT' and values['status'] == 'SCHEDULED':
        appointment = KamAppointment.objects.create(
            enterprise=enterprise, kam=user, title=values['title'], scheduled_at=values['scheduled_at'],
            location=values['location'], contact_name=values['contact_name'], objective=values['description'],
            meeting_type='PHYSICAL', visit_purpose='FOLLOW_UP', purpose_source='MANUAL',
        )
    completed = values['status'] == 'COMPLETED'
    return AccountCommercialAction.objects.create(
        enterprise=enterprise, created_by=user, appointment=appointment,
        completed_by=user if completed else None,
        completed_at=values['scheduled_at'] if completed else None, **values,
    )


class ActionTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['COMPLETED', 'CANCELLED'])
    result = serializers.CharField(max_length=5000)


@transaction.atomic
def transition_action(enterprise, action_id, user, data):
    serializer = ActionTransitionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    action = get_object_or_404(AccountCommercialAction.objects.select_for_update(), pk=action_id, enterprise=enterprise)
    if action.appointment_id:
        action.appointment = KamAppointment.objects.select_for_update().get(pk=action.appointment_id)
    values = serializer.validated_data
    if action_state(action) not in ('SCHEDULED', 'IN_PROGRESS'):
        if action.status == values['status'] and action.result == values['result']:
            return action
        raise serializers.ValidationError('Cette action est déjà clôturée. Rechargez l’historique.')
    action.status = values['status']
    action.result = values['result']
    action.completed_by = user
    action.completed_at = timezone.now()
    action.save(update_fields=['status', 'result', 'completed_by', 'completed_at', 'updated_at'])
    if action.appointment_id:
        action.appointment.status = action.status
        action.appointment.save(update_fields=['status', 'updated_at'])
    return action
