"""Recover sourced legacy account observations without inventing v2 research jobs or certainty."""
import hashlib
import json
import re
import unicodedata
import uuid

from django.db import transaction

from kam.models import AnalysisSignalRun
from kam.services.analysis_signal_ingestion import _retain_fact, observation_time
from sales.models import Enterprise


def _name_key(value):
    value = unicodedata.normalize('NFKC', str(value or '')).casefold()
    return ' '.join(re.sub(r'[^\w]+', ' ', value).split())


def _eligible_facts(result):
    identity = result.get('identity')
    if not isinstance(identity, dict) or identity.get('status') not in ('confirmed', 'probable'):
        return []
    evidence = {row.get('id'): row for row in result.get('evidence', []) if isinstance(row, dict)}
    sources = {row.get('id'): row for row in result.get('sources', []) if isinstance(row, dict)}
    facts = []
    for fact in result.get('facts', []):
        if not isinstance(fact, dict) or not isinstance(fact.get('statement'), str) or not fact['statement'].strip() or not isinstance(fact.get('category'), str):
            continue
        references = fact.get('evidence_ids')
        if not isinstance(references, list) or not references or not all(isinstance(key, (str, int)) for key in references):
            continue
        linked = [evidence.get(key) for key in references]
        if not all(row and row.get('snippet') and sources.get(row.get('source_id'), {}).get('access_status') == 'accessible'
                   for row in linked):
            continue
        facts.append({**fact, 'field': fact['category'], 'kind': 'text',
            'value': fact['statement'], 'normalized_value': fact['statement'], 'valid_at': None,
            'support_status': 'legacy_unvalidated', 'attribution': 'legacy_report',
            'original_legacy_fact': fact})
    return facts


@transaction.atomic
def retain_legacy_account_research(enterprise_id):
    enterprise = Enterprise.objects.select_for_update().get(pk=enterprise_id)
    result = enterprise.scraped_data
    if not isinstance(result, dict) or 'provider_research' not in result:
        return False
    identity = result.get('identity') or {}
    subject = result.get('subject') or {}
    if not isinstance(identity, dict) or not isinstance(subject, dict):
        return False
    resolved = identity.get('resolved_subject') or {}
    if not isinstance(resolved, dict):
        return False
    names = {_name_key(subject.get('name')), _name_key(resolved.get('name'))}
    if _name_key(enterprise.name) not in names or not enterprise.last_sync_date:
        return False
    facts = _eligible_facts(result)
    times = [parsed for fact in facts if (parsed := observation_time(fact.get('verified_at'), None)) is not None]
    # The timestamp already saved by the old importer is the fallback, not today's import time.
    observed_at = max(times) if times else enterprise.last_sync_date
    digest = hashlib.sha256(json.dumps(result, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    local_reference = uuid.uuid5(uuid.NAMESPACE_URL, f'onbora:legacy-account:{enterprise.pk}:{digest}')
    run, created = AnalysisSignalRun.objects.get_or_create(origin_job_id=local_reference, defaults={
        'enterprise': enterprise, 'sector': ' '.join((enterprise.sector or '').split()) or 'Secteur non renseigné',
        'observed_at': observed_at, 'outcome': 'legacy_account_snapshot',
    })
    if created:
        for fact in facts:
            _retain_fact(enterprise, run, fact, result, confidence_override='LEGACY_REVIEW')
    return created
