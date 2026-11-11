"""Projection idempotente des lectures CRM dans les modèles métier Onbora."""
from decimal import Decimal, InvalidOperation
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from sales.models import Enterprise, EnterpriseInstalledOffer, AccountProjection, SegmentationConfig
from kam.models import RelationshipCoverage
from kam.services.enterprise_comparison_service import EnterpriseComparisonService
from .models import DynamicsImportedRecord
from .models import User


class ImportRecordError(ValueError):
    pass


def number(value, integer=False):
    if value is None:
        return None
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result < 0 or (integer and result != int(result)):
            raise ValueError()
        if (integer and result > 2147483647) or (not integer and result >= Decimal('1e13')):
            raise ValueError()
        return int(result) if integer else result
    except (ValueError, InvalidOperation, OverflowError):
        raise ImportRecordError('Valeur numérique invalide.') from None


def text(value, maximum):
    if value is None:
        return ''
    if not isinstance(value, str) or len(value) > maximum:
        raise ImportRecordError('Texte CRM incompatible avec le champ Onbora.')
    return value.strip()


def remote_uuid(value):
    try:
        return UUID(str(value))
    except ValueError:
        raise ImportRecordError('Identifiant CRM invalide.') from None


def date_value(value):
    if not value:
        return None
    result = parse_date(str(value)[:10])
    if result is None:
        raise ImportRecordError('Date CRM invalide.')
    return result


def offer_status(values):
    label = str(values.get('status_label', '')).strip().casefold()
    statuses = {
        'active': 'ACTIVE', 'actif': 'ACTIVE', 'en service': 'ACTIVE',
        'inactive': 'INACTIVE', 'inactif': 'INACTIVE', 'terminated': 'TERMINATED', 'résilié': 'TERMINATED',
        'expired': 'EXPIRED', 'expiré': 'EXPIRED', 'suspended': 'SUSPENDED', 'suspendu': 'SUSPENDED',
        'pending activation': 'PENDING_ACTIVATION', 'en déploiement': 'PENDING_ACTIVATION',
    }
    status = statuses.get(label, 'UNKNOWN')
    end = date_value(values.get('end_date'))
    return 'EXPIRED' if status == 'ACTIVE' and end and end < timezone.localdate() else status


def pillar_for(enterprise, name):
    pillars = EnterpriseComparisonService.get_sector_policy(enterprise.sector).get('pillars', [])
    matches = [p['id'] for p in pillars if any(keyword.lower() in name.lower() for keyword in p.get('match_keywords', []))]
    return matches[0] if len(matches) == 1 else ''


def import_account(record, values, currencies):
    name = text(values.get('name'), 100)
    if not name:
        raise ImportRecordError('Compte sans nom.')
    enterprise = record.enterprise if record.pk else None
    if enterprise is None:
        candidates = list(Enterprise.objects.filter(crm_id=str(record.remote_id), dynamics_records__isnull=True)[:2])
        if len(candidates) > 1:
            raise ImportRecordError('Identifiant CRM rattaché à plusieurs entreprises.')
        enterprise = candidates[0] if candidates else Enterprise(
            annual_revenue=None, employee_count=None, site_count=None,
            current_connectivity='', city='', plaque='', segment='UNKNOWN', assigned_entity='KAM_OFFICE',
        )
    enterprise.name = name
    if enterprise.pk and AccountProjection.objects.filter(enterprise=enterprise, sync_status__in=('PENDING_PUSH', 'CONFLICT')).exists():
        raise ImportRecordError('Modifications locales en attente : compte à vérifier avant écrasement.')
    enterprise.crm_id = str(record.remote_id)
    for source, target, size in (
        ('sector', 'sector', 100), ('city', 'city', 100), ('address', 'address', 255),
        ('website', 'website', 200), ('tax_number', 'nif', 100), ('rccm', 'rccm', 100),
    ):
        if source in values:
            setattr(enterprise, target, text(values[source], size))
    for source, target in (('employees', 'employee_count'), ('sites', 'site_count')):
        if source in values:
            setattr(enterprise, target, number(values[source], integer=True))
    if 'revenue' in values:
        # Les colonnes financières historiques Onbora sont en USD. Aucune conversion inventée.
        enterprise.annual_revenue = number(values['revenue']) if currencies.get(str(values.get('currency'))) == 'USD' else None
        if enterprise.annual_revenue is not None:
            config = SegmentationConfig.get_active()
            revenue = enterprise.annual_revenue
            enterprise.segment = 'GRAND_COMPTE' if revenue > config.pme_max_revenue else ('PME' if revenue >= config.tpe_max_revenue else 'TPE_INFORMEL')
            enterprise.assigned_entity = 'BACK_OFFICE' if enterprise.segment == 'TPE_INFORMEL' else 'KAM_OFFICE'
    if enterprise.assigned_entity == 'KAM_OFFICE' and not enterprise.assigned_kam_id and values.get('owner_email'):
        matches = list(User.objects.filter(email__iexact=values['owner_email'], role=User.KAM, is_active=True)[:2])
        if len(matches) == 1:
            enterprise.assigned_kam = matches[0]
            enterprise.assigned_at = timezone.now()
    enterprise.last_sync_date = timezone.now()
    enterprise.sync_status = 'SYNCED'
    enterprise.save()
    record.enterprise = enterprise
    AccountProjection.objects.update_or_create(enterprise=enterprise, defaults={
        'crm_account_id': str(record.remote_id), 'source_system': 'DYNAMICS_365',
        'raw_crm_payload': values, 'last_pulled_at': timezone.now(), 'sync_status': 'IN_SYNC',
        'source_version': text(values.get('source_version'), 100),
    })


def import_offer(record, values, currencies):
    name = text(values.get('name'), 200)
    if not name:
        raise ImportRecordError('Produit sans nom.')
    offer = record.installed_offer or EnterpriseInstalledOffer(enterprise=record.enterprise)
    offer.enterprise = record.enterprise
    offer.installed_offer_name = name
    offer.sector_pillar_id = pillar_for(record.enterprise, name)
    offer.category = next((p.get('category', '') for p in EnterpriseComparisonService.get_sector_policy(record.enterprise.sector).get('pillars', [])
                           if p['id'] == offer.sector_pillar_id), '')
    provider = str(values.get('provider') or '').casefold()
    offer.provider = 'ORANGE_BUSINESS' if provider in ('orange', 'orange business') else ('AUTRE' if provider else 'UNKNOWN')
    offer.contract_status = offer_status(values)
    offer.bandwidth_mbps = number(values.get('bandwidth'), integer=True)
    offer.active_licenses_count = number(values.get('licenses'), integer=True)
    offer.monthly_cost_mrr = number(values.get('monthly_cost')) if currencies.get(str(values.get('currency'))) == 'USD' else None
    offer.installation_date = date_value(values.get('start_date'))
    offer.contract_end_date = date_value(values.get('end_date'))
    offer.save()
    record.installed_offer = offer


def import_contact(record, values):
    name = text(values.get('name'), 150)
    if not name:
        raise ImportRecordError('Contact sans nom.')
    contact = record.contact or RelationshipCoverage(
        enterprise=record.enterprise, role_classification='END_USER', coverage_status='MISSING',
    )
    contact.enterprise = record.enterprise
    contact.contact_name = name
    for source, target, size in (('role', 'contact_role', 100), ('email', 'contact_email', 254), ('phone', 'contact_phone', 50)):
        if source in values:
            setattr(contact, target, text(values[source], size))
    contact.save()
    record.contact = contact


@transaction.atomic
def upsert_record(source_key, kind, scope, values, currencies):
    if values.get('currency'):
        values['currency_code'] = currencies.get(str(values['currency']))
    remote_id = remote_uuid(values.get('id'))
    record = DynamicsImportedRecord.objects.select_related('enterprise', 'installed_offer', 'contact').filter(
        source_key=source_key, entity=scope['entity'], remote_id=remote_id,
    ).first() or DynamicsImportedRecord(source_key=source_key, entity=scope['entity'], remote_id=remote_id, kind=kind)
    if kind == 'accounts':
        import_account(record, values, currencies)
    else:
        if not text(values.get('name'), 255):
            raise ImportRecordError('Enregistrement CRM sans nom.')
        if values.get('account_type') != 'account':
            raise ImportRecordError('Relation vers un compte non confirmée.')
        parent_id = remote_uuid(values.get('account'))
        parent = DynamicsImportedRecord.objects.select_related('enterprise').filter(
            source_key=source_key, kind='accounts', remote_id=parent_id,
        ).first()
        if parent is None:
            raise ImportRecordError('Compte parent absent de cet import.')
        record.enterprise = parent.enterprise
        if kind == 'offers':
            import_offer(record, values, currencies)
        elif kind == 'contacts':
            import_contact(record, values)
    record.data = values
    record.save()
    return record
