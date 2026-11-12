"""Publish a factual profile entry for each imported account, without inventing news."""
import uuid

from kam.models import B2BNewsFeedItem


def import_entry_id(external_id):
    return uuid.uuid5(uuid.NAMESPACE_URL, 'onbora:account-import:' + external_id)


def publish_imported_account(record, enterprise):
    payload = record.payload
    is_lead = payload['kind'] == 'lead'
    discovery = is_lead and not enterprise.assigned_kam_id
    fields = {
        'enterprise': enterprise,
        'is_web_discovery': discovery,
        'is_converted_to_portfolio': bool(enterprise.assigned_kam_id),
        'title': 'Fiche entreprise disponible' if discovery else 'Fiche compte intégrée',
        'summary': payload.get('activity') or ' · '.join(filter(None, [
            payload['name'], payload.get('sector'), enterprise.location])),
        'source_name': 'Onbora Analysis' if is_lead else 'CRM',
        # A registry profile is not an economic event or a commercial signal.
        'source_url': '', 'category': 'NEW_ACCOUNT', 'priority': 'NORMAL',
        'signal_strength': 'WEAK', 'signal_score': 0, 'signal_rationale': '',
        'commercial_angle': '', 'recommended_offer': '', 'recommended_action': '',
        'discovered_company_name': payload['name'][:150],
        'discovered_website': enterprise.website or '',
        'discovered_sector': enterprise.sector or '',
        'discovered_location': (enterprise.location or '')[:150],
    }
    item, created = B2BNewsFeedItem.objects.get_or_create(
        id=import_entry_id(record.external_id), defaults=fields)
    if not created:
        # Preserve publication time, read status and favorites across re-imports.
        for key, value in fields.items():
            setattr(item, key, value)
        item.save(update_fields=[*fields, 'updated_at'])
    return item
