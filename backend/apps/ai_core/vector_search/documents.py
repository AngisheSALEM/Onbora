"""The persisted search document uses the same source context as Core AI."""
from ..company_analysis.account_context import build_account_context
from ..company_analysis.adapter import supported_facts


def enterprise_document(enterprise):
    context = build_account_context(enterprise)
    public = supported_facts(enterprise.scraped_data or {})
    content = context['text'] + '\n' + '\n'.join(f['statement'] for f in public)
    return {'id': f'enterprise_profile_{enterprise.pk}', 'doc_type': 'enterprise_profile',
            'title': f'Fiche profil - {enterprise.name}', 'content_to_vectorize': content.strip(),
            'metadata': {'enterprise_id': enterprise.pk, 'name': enterprise.name,
                         'sector': enterprise.sector, 'segment': enterprise.segment,
                         'city': enterprise.city, 'employee_count': enterprise.employee_count,
                         'site_count': enterprise.site_count,
                         'current_connectivity': enterprise.current_connectivity,
                         'context_fingerprint': context['fingerprint'],
                         'installed_services': list(enterprise.installed_offers.filter(
                             contract_status='ACTIVE').values_list('installed_offer_name', flat=True))}}


def persist_enterprise_document(enterprise):
    from ..models import AIVectorDocument
    document = enterprise_document(enterprise)
    AIVectorDocument.objects.update_or_create(doc_id=document['id'], defaults={'document': document})
    return document
