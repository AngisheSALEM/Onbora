"""Atomic upsert of seed-owned profiles, preserving commercial work on replay."""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from sales.models import CrmAccountRecord, Enterprise, SeedImportRecord


class SeedIdentityConflict(APIException):
    status_code = 409
    default_detail = 'Cette référence appartient déjà à une autre provenance.'


def initial_enterprise_fields(data):
    contacts = data.get('contacts', [])
    contact = contacts[0] if contacts else {}
    # Explicitly clear legacy model defaults that would invent qualification data.
    return {
        'annual_revenue': None, 'employee_count': None, 'site_count': None,
        'current_connectivity': '', 'pain_level': '', 'plaque': '',
        'is_ready_for_conversion': False, 'conversion_score': 0,
        'recommended_solution': '', 'segment': 'UNKNOWN',
        'contact_name': contact.get('name', ''), 'contact_email': contact.get('email'),
        'contact_phone': contact.get('phone') or '',
        'conversion_status': {'qualified': 'IN_NEGOTIATION', 'customer': 'CONVERTED'}.get(
            data.get('status'), 'PROSPECT'),
    }


@transaction.atomic
def import_seed_record(data, payload):
    from accounts.models import User
    from kam.services.imported_accounts import publish_imported_account

    owner = None
    if data.get('assigned_kam_username'):
        owner = User.objects.filter(username=data['assigned_kam_username'], role='KAM', is_active=True).first()
        if owner is None:
            raise ValidationError({'assigned_kam_username': 'Choisissez un KAM actif.'})
    record, created = SeedImportRecord.objects.get_or_create(external_id=data['external_id'])
    record = SeedImportRecord.objects.select_for_update().get(pk=record.pk)
    if record.payload and any(record.payload.get(key) != payload.get(key)
                              for key in ('kind', 'source', 'is_fictitious')):
        raise SeedIdentityConflict()
    fields = {
        'name': data['name'][:100], 'sector': data.get('sector', '')[:100],
        'city': data.get('city', ''), 'address': data.get('address', '')[:255],
        'website': data.get('website', '')[:200],
        'location': ', '.join(filter(None, [data.get('city'), data.get('province')]))[:200],
    }
    if created:
        enterprise = Enterprise.objects.create(**fields, **initial_enterprise_fields(data))
        if data['kind'] == 'company':
            crm, crm_created = CrmAccountRecord.objects.get_or_create(
                external_crm_id=data['external_id'], defaults={
                    'source_system': 'ONBORA_SEED', 'legal_name': data['name'][:200],
                    'employee_count': None, 'site_count': None, 'crm_contract_status': '',
                    'payment_health': '', 'credit_score': '',
                    'raw_attributes': {'seed': payload},
                })
            if not crm_created:
                raise SeedIdentityConflict()
            enterprise.crm_record = crm
            enterprise.save(update_fields=['crm_record'])
        record.enterprise = enterprise
    else:
        enterprise = Enterprise.objects.select_for_update().get(pk=record.enterprise_id)
        for key, value in fields.items():
            setattr(enterprise, key, value)
        enterprise.save(update_fields=list(fields))
        if data['kind'] == 'company':
            if not enterprise.crm_record_id:
                raise SeedIdentityConflict()
            crm = CrmAccountRecord.objects.select_for_update().get(pk=enterprise.crm_record_id)
            if crm.source_system != 'ONBORA_SEED' or crm.external_crm_id != data['external_id']:
                raise SeedIdentityConflict()
            attributes = dict(crm.raw_attributes)
            attributes['seed'] = payload
            crm.raw_attributes = attributes
            crm.legal_name = data['name'][:200]
            crm.save(update_fields=['legal_name', 'raw_attributes', 'last_sync_at'])
    if owner and not enterprise.assigned_kam_id:
        enterprise.assigned_kam = owner
        enterprise.assigned_at = timezone.now()
        enterprise.assigned_entity = 'KAM_OFFICE'
        enterprise.save(update_fields=['assigned_kam', 'assigned_at', 'assigned_entity'])
    record.payload = payload
    record.save(update_fields=['enterprise', 'payload', 'updated_at'])
    publish_imported_account(record, enterprise)
    from apps.ai_core.vector_search.documents import persist_enterprise_document
    persist_enterprise_document(enterprise)
    return enterprise, created
