"""Publish a factual profile entry for each imported account, without inventing news."""
import uuid
from urllib.parse import urlsplit

from kam.models import B2BNewsFeedItem


def import_entry_id(external_id):
    return uuid.uuid5(uuid.NAMESPACE_URL, 'onbora:account-import:' + external_id)


def lead_information(enterprise, payload):
    from apps.ai_core.company_analysis.adapter import supported_facts

    facts = supported_facts(enterprise.scraped_data or {})
    event = next((fact for field in ('news', 'projects_partnerships')
                  for fact in facts if fact['field'] == field), None)
    activity = payload.get('activity') or enterprise.sector or enterprise.name
    basis = ('Actualité repérée' if event['field'] == 'news' else 'Projet identifié') if event else 'Activité à qualifier'
    public = [fact['statement'] for fact in facts if fact['field'] in (
        'activities', 'description', 'projects_partnerships', 'news')]
    details = [activity, *public[:4]]
    if enterprise.address:
        details.append('Adresse : ' + enterprise.address)
    rationale = ('Cet élément public fournit un point de départ pour contacter l’entreprise. '
                 'Vérifiez les équipes concernées, le calendrier et les besoins associés.') if event else (
        'Cette entreprise est à qualifier au regard de son activité. '
        'Aucun événement commercial précis n’est établi ; identifiez ses usages et ses priorités lors du premier échange.')
    url = ''
    if event:
        captures = {capture['id']: capture for capture in enterprise.scraped_data.get('evidence', [])}
        sources = {source['id']: source for source in enterprise.scraped_data.get('sources', [])}
        capture = captures.get(event['evidence_ids'][0], {})
        url = sources.get(capture.get('source_id'), {}).get('url', '')
    else:
        url = next((source.get('url', '') for source in payload.get('sources', []) if source.get('url')), '')
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
            url = ''
    except ValueError:
        url = ''
    return {'basis': basis, 'title': (event['statement'] if event else activity)[:255],
            'summary': ' '.join(dict.fromkeys(details))[:1000], 'rationale': rationale, 'source_url': url}


def publish_imported_account(record, enterprise):
    payload = record.payload
    is_lead = payload['kind'] == 'lead'
    discovery = is_lead and not enterprise.assigned_kam_id
    information = lead_information(enterprise, payload)
    fields = {
        'enterprise': enterprise,
        'is_web_discovery': discovery,
        'is_converted_to_portfolio': bool(enterprise.assigned_kam_id),
        'title': information['title'],
        'summary': information['summary'],
        'source_name': 'Onbora Analysis' if is_lead else 'CRM',
        # A registry profile is not an economic event or a commercial signal.
        'source_url': information['source_url'], 'category': 'NEW_ACCOUNT', 'priority': 'NORMAL',
        'signal_strength': 'WEAK', 'signal_score': 0, 'signal_rationale': '',
        'commercial_angle': information['rationale'], 'recommended_offer': '',
        'recommended_action': 'Identifier l’interlocuteur et qualifier les usages, les difficultés et les services existants.',
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
