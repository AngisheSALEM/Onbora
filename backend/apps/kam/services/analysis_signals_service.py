"""Scoped signal analytics and personal KAM follow-up; no network I/O on reads."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import CharField, Count, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.ai_core.access import visible_enterprises
from kam.models import (AnalysisSignal, AnalysisSignalObservation, AnalysisSignalReview,
                        AnalysisSignalReviewEvent, AnalysisSignalRun)

LOCAL_ZONE = ZoneInfo('Africa/Kinshasa')
CATEGORIES = {'ACTIVITY': 'Activités', 'LOCATION': 'Implantations', 'CONTACT': 'Contacts & gouvernance',
              'PROJECT': 'Projets & partenariats', 'NEWS': 'Actualités', 'IDENTITY': 'Identité',
              'OFFER': 'Produits & services', 'DESCRIPTION': 'Présentation', 'OTHER': 'Autres faits'}
CONFIDENCES = {'CORROBORATED': 'Recoupé', 'SUPPORTED': 'Sourcé',
               'IDENTITY_UNCERTAIN': 'Identité à confirmer', 'UNKNOWN': 'Non renseigné'}
PRIORITIES = dict(AnalysisSignalReview.PRIORITIES)
STATES = dict(AnalysisSignalReview.STATES)


def date_window(params):
    today = timezone.localtime(timezone.now(), LOCAL_ZONE).date()
    end = params.get('end') or today
    start = params.get('start') or end - timedelta(days=int(params.get('days', 30)) - 1)
    if start > end or (end - start).days > 365 or end > today:
        raise ValidationError('Choisissez une période passée ou actuelle de 366 jours maximum.')
    return start, end, datetime.combine(start, time.min, LOCAL_ZONE), datetime.combine(end + timedelta(days=1), time.min, LOCAL_ZONE)


def annotated_signals(user, until=None):
    observations = AnalysisSignalObservation.objects.filter(signal=OuterRef('pk'))
    if until:
        observations = observations.filter(observed_at__lt=until)
    latest = observations.order_by('-observed_at', '-pk')
    reviews = AnalysisSignalReview.objects.filter(signal=OuterRef('pk'), user=user)
    return AnalysisSignal.objects.filter(enterprise__in=visible_enterprises(user)).annotate(
        confidence=Coalesce(Subquery(latest.values('confidence')[:1]), Value('UNKNOWN'), output_field=CharField()),
        review_state=Coalesce(Subquery(reviews.values('state')[:1]), Value('NEW'), output_field=CharField()),
        review_priority=Coalesce(Subquery(reviews.values('priority')[:1]), Value('UNKNOWN'), output_field=CharField()),
        actioned_at=Subquery(reviews.values('actioned_at')[:1]),
    )


def serialize_signal(signal):
    return {'id': str(signal.pk), 'enterprise_id': signal.enterprise_id,
            'company': signal.enterprise.name, 'sector': signal.sector or 'Secteur non renseigné',
            'title': signal.title, 'category': signal.category, 'confidence': signal.confidence,
            'priority': signal.review_priority, 'state': signal.review_state,
            'first_seen': signal.first_seen, 'last_seen': signal.last_seen, 'event_date': signal.event_date,
            'actioned_at': signal.actioned_at}


def _counts(queryset, field):
    return {row[field]: row['count'] for row in queryset.order_by().values(field).annotate(count=Count('pk'))}


def _apply_filters(queryset, params, prefix=''):
    fields = {'sector': 'sector', 'category': 'category', 'confidence': 'confidence',
              'priority': 'review_priority', 'state': 'review_state'}
    for key, field in fields.items():
        if params.get(prefix + key):
            queryset = queryset.filter(**{field: params[prefix + key]})
    query = params.get('q', '').strip()
    if query:
        from django.db.models import Q
        queryset = queryset.filter(Q(title__icontains=query) | Q(enterprise__name__icontains=query))
    return queryset


def signal_dashboard(user, params):
    start, end, since, until = date_window(params)
    visible = visible_enterprises(user)
    base = annotated_signals(user, until).filter(first_seen__gte=since, first_seen__lt=until)
    signals = _apply_filters(base, params)
    runs = AnalysisSignalRun.objects.filter(enterprise__in=visible, observed_at__gte=since, observed_at__lt=until)
    if params.get('sector'):
        runs = runs.filter(sector=params['sector'])
    daily = {row['day']: row['count'] for row in signals.order_by().annotate(
        day=TruncDate('first_seen', tzinfo=LOCAL_ZONE)).values('day').annotate(count=Count('pk'))}
    timeline = [{'day': (start + timedelta(days=offset)).isoformat(),
                 'count': daily.get(start + timedelta(days=offset), 0)} for offset in range((end - start).days + 1)]
    return {
        'period': {'start': start, 'end': end}, 'generated_at': timezone.now(),
        'options': {'categories': CATEGORIES, 'confidences': CONFIDENCES, 'priorities': PRIORITIES, 'states': STATES,
                    'sectors': list(AnalysisSignalRun.objects.filter(enterprise__in=visible).order_by('sector').values_list('sector', flat=True).distinct())},
        'stats': {'new_signals': signals.count(), 'companies': signals.values('enterprise_id').distinct().count(),
                  'priority_pending': signals.filter(review_priority='HIGH', review_state__in=['NEW', 'VERIFY']).count(),
                  'actioned': signals.filter(actioned_at__isnull=False).count(),
                  'analyzed_companies': runs.values('enterprise_id').distinct().count(), 'research_runs': runs.count()},
        'timeline': timeline, 'categories': _counts(signals, 'category'), 'states': _counts(signals, 'review_state'),
        'sector_matrix': _sector_matrix(signals, runs),
        'priority_matrix': list(signals.order_by().values('review_priority', 'confidence').annotate(count=Count('pk'))),
        'list': _signal_list(signals, params),
    }


def _sector_matrix(signals, runs):
    coverage = {row['sector']: row['count'] for row in runs.order_by().values('sector').annotate(count=Count('enterprise_id', distinct=True))}
    matrix = {}
    for row in signals.order_by().values('sector', 'category').annotate(count=Count('pk')):
        matrix.setdefault(row['sector'], {})[row['category']] = row['count']
    return [{'sector': sector, 'analyzed_companies': coverage.get(sector, 0), 'categories': matrix.get(sector, {})}
            for sector in sorted(set(coverage) | set(matrix))]


def _signal_list(signals, params):
    rows = _apply_filters(signals, params, 'focus_')
    if params.get('focus_day'):
        start = datetime.combine(params['focus_day'], time.min, LOCAL_ZONE)
        rows = rows.filter(first_seen__gte=start, first_seen__lt=start + timedelta(days=1))
    count = rows.count()
    page = params.get('page', 1)
    return {'count': count, 'page': page, 'page_size': 20,
            'results': [serialize_signal(signal) for signal in rows.select_related('enterprise').order_by('-first_seen', '-pk')[(page-1)*20:page*20]]}


def signal_detail(user, signal_id, history_page=1):
    signal = annotated_signals(user).select_related('enterprise').filter(pk=signal_id).first()
    if signal is None:
        raise NotFound('Signal introuvable.')
    review = AnalysisSignalReview.objects.filter(signal=signal, user=user).first()
    observations = signal.observations.select_related('run').order_by('-observed_at', '-pk')
    events = signal.review_events.filter(user=user).order_by('-created_at', '-pk')
    return {**serialize_signal(signal), 'note': review.note if review else '',
        'history': {'count': observations.count(), 'page': history_page, 'page_size': 10,
                    'results': [{'observed_at': row.observed_at, 'recorded_at': row.run.recorded_at,
                                 'confidence': row.confidence, **row.payload}
                                for row in observations[(history_page-1)*10:history_page*10]]},
        'followup': [{'state': event.state, 'priority': event.priority, 'note': event.note,
                      'created_at': event.created_at} for event in events[:20]],
        'followup_count': events.count()}


@transaction.atomic
def review_signal(user, signal_id, values):
    signal = AnalysisSignal.objects.select_for_update().filter(
        pk=signal_id, enterprise__in=visible_enterprises(user)).first()
    if signal is None:
        raise NotFound('Signal introuvable.')
    review, _ = AnalysisSignalReview.objects.get_or_create(signal=signal, user=user)
    state, priority = values.get('state', review.state), values.get('priority', review.priority)
    note = values.get('note', review.note).strip()
    if state == 'ACTIONED' and not note:
        raise ValidationError({'note': 'Précisez l’action engagée pour conserver une trace utile.'})
    if (review.state, review.priority, review.note) != (state, priority, note):
        review.state, review.priority, review.note = state, priority, note
        if state == 'ACTIONED' and review.actioned_at is None:
            review.actioned_at = timezone.now()
        review.save()
        AnalysisSignalReviewEvent.objects.create(signal=signal, user=user, state=state, priority=priority, note=note)
    return signal_detail(user, signal_id)
