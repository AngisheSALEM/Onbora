from datetime import date, timedelta

from django.db import migrations


def backfill_visit_purposes(apps, schema_editor):
    KamAppointment = apps.get_model('kam', 'KamAppointment')
    KamVisitReport = apps.get_model('kam', 'KamVisitReport')
    today = date.today()

    for appointment in KamAppointment.objects.filter(visit_purpose__isnull=True).select_related('enterprise'):
        enterprise = appointment.enterprise
        status = enterprise.conversion_status
        crm_data = enterprise.existing_crm_data if isinstance(enterprise.existing_crm_data, dict) else {}

        if status == 'LOST':
            continue

        renewal_date = None
        raw_renewal_date = crm_data.get('orange_contract_end_date')
        if isinstance(raw_renewal_date, str):
            try:
                renewal_date = date.fromisoformat(raw_renewal_date)
            except ValueError:
                pass

        if status == 'CONVERTED' and renewal_date and today <= renewal_date <= today + timedelta(days=120):
            purpose = 'GROWTH'
            reason = 'Contrat Orange indiqué comme arrivant à échéance sous 120 jours.'
        elif status == 'CONVERTED' and crm_data.get('growth_project'):
            purpose = 'GROWTH'
            reason = 'Un projet de développement est renseigné sur ce compte.'
        elif status == 'CONVERTED':
            purpose = 'FOLLOW_UP'
            reason = 'Le compte est marqué comme signé dans Onbora.'
        elif status == 'IN_NEGOTIATION':
            purpose = 'QUALIFICATION'
            reason = 'Une négociation est en cours sur ce compte.'
        else:
            reports = KamVisitReport.objects.filter(
                enterprise_id=enterprise.id,
                created_at__lt=appointment.scheduled_at,
            ).values_list('confirmed_needs', flat=True)
            if any(needs for needs in reports):
                purpose = 'QUALIFICATION'
                reason = 'Des besoins avaient été confirmés avant ce rendez-vous.'
            else:
                purpose = 'DISCOVERY'
                reason = 'Aucun besoin qualifié ni contrat signé n’était enregistré.'

        appointment.visit_purpose = purpose
        appointment.purpose_source = 'AUTO'
        appointment.purpose_reason = reason
        appointment.save(update_fields=['visit_purpose', 'purpose_source', 'purpose_reason'])


class Migration(migrations.Migration):
    dependencies = [
        ('kam', '0010_kamappointment_visit_purpose'),
    ]

    operations = [
        migrations.RunPython(backfill_visit_purposes, migrations.RunPython.noop),
    ]
