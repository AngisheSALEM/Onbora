"""Read a collaborator's SQLite snapshot without executing code or changing its DB."""
import copy
import hashlib
import json
import sqlite3
import re
import unicodedata
from collections import Counter
from contextlib import closing
from pathlib import Path

from django.db import transaction

from .adapter import supported_facts


def read_snapshot(path):
    path = Path(path).resolve(strict=True)
    if any(Path(str(path) + suffix).exists() for suffix in ('-wal', '-journal')):
        raise ValueError('Utilisez une sauvegarde SQLite autonome, sans journal actif.')
    with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as connection:
        connection.execute('PRAGMA query_only=ON')
        connection.row_factory = sqlite3.Row
        companies = [dict(row) for row in connection.execute('SELECT * FROM research_company')]
        jobs = [dict(row) for row in connection.execute(
            "SELECT * FROM research_researchjob WHERE state='completed' "
            "AND pipeline_version IN ('public-v1', 'public-ai-v1') ORDER BY completed_at, id")]
    return companies, jobs


def combine_research(jobs):
    """Union attributable observations, with namespaced references across jobs."""
    merged = None
    seen = set()
    for job in jobs:
        result = json.loads(job['result'] or '{}')
        facts = supported_facts(result)
        if not facts:
            continue
        if merged is None:
            merged = copy.deepcopy(result)
            for key in ('facts', 'evidence', 'sources', 'contradictions'):
                merged[key] = []
            merged['summary'] = {'status': 'abstained', 'sentences': []}
            merged['identity']['evidence_ids'] = []
            for entry in merged['profile'].values():
                entry['fact_ids'] = []
        prefix = job['id'] + ':'
        evidence_ids = set()
        for fact in facts:
            signature = (fact['field'], fact['statement'].strip().casefold())
            if signature in seen:
                continue
            seen.add(signature)
            item = copy.deepcopy(fact)
            item['id'] = prefix + item['id']
            evidence_ids.update(item['evidence_ids'])
            item['evidence_ids'] = [prefix + key for key in item['evidence_ids']]
            merged['facts'].append(item)
            merged['profile'][item['field']]['fact_ids'].append(item['id'])
            merged['profile'][item['field']]['status'] = 'found'
        source_ids = set()
        for capture in result.get('evidence', []):
            if capture['id'] not in evidence_ids:
                continue
            item = copy.deepcopy(capture)
            source_ids.add(item['source_id'])
            item['id'], item['source_id'] = prefix + item['id'], prefix + item['source_id']
            merged['evidence'].append(item)
        for source in result.get('sources', []):
            if source['id'] in source_ids:
                item = copy.deepcopy(source)
                item['id'] = prefix + item['id']
                merged['sources'].append(item)
    if merged:
        merged['outcome'] = 'partial'
        merged['missing_fields'] = [key for key, entry in merged['profile'].items()
                                    if entry.get('requested') and not entry['fact_ids']]
    return merged


def import_snapshot(path, *, apply=False):
    from sales.models import Enterprise, SeedImportRecord
    from sales.services.seed_import import import_seed_record
    from ..vector_search.documents import persist_enterprise_document

    companies, jobs = read_snapshot(path)
    existing = {}
    for record in SeedImportRecord.objects.select_related('enterprise'):
        origin = record.payload.get('onbora') or record.payload.get('registry') or {}
        if origin.get('source_ref'):
            existing[origin['source_ref']] = record
    jobs_by_company = {}
    company_index = {row['id']: row for row in companies}
    def identity_key(value):
        return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value).casefold())
    for job in jobs:
        company = company_index.get(job.get('company_id'))
        subject = json.loads(job['result'] or '{}').get('subject', {}).get('name', '')
        if company and identity_key(subject) in {identity_key(company['name']), identity_key(company['alias'])}:
            jobs_by_company.setdefault(job['company_id'], []).append(job)
    selected = [row for row in companies if row['showcase'] or row['source_ref'] in existing
                or row['id'] in jobs_by_company]
    counts = Counter(registry_total=len(companies), selected=len(selected), research_jobs=len(jobs))
    # One transaction: a malformed profile cannot leave a half-imported batch.
    with transaction.atomic():
        for row in selected:
            previous = existing.get(row['source_ref'])
            key = 'onbora-' + hashlib.sha256(('onbora\0' + row['source_ref']).encode()).hexdigest()
            payload = copy.deepcopy(previous.payload) if previous else {
                'external_id': key, 'kind': 'lead', 'source': 'onbora', 'is_fictitious': False,
                'onbora': {'instance': 'onbora', 'source_ref': row['source_ref']},
                'contacts': [], 'status': 'new'}
            payload['external_id'] = previous.external_id if previous else key
            for field in ('name', 'alias', 'sector', 'subsector', 'province', 'city',
                          'address', 'activity', 'website', 'showcase'):
                if row[field]:
                    payload[field] = row[field]
            payload['identifiers'] = json.loads(row['identifiers'])
            payload['sources'] = json.loads(row['sources'])
            payload['research_snapshot'] = [{'job_id': job['id'], 'completed_at': job['completed_at'],
                'outcome': json.loads(job['result'] or '{}').get('outcome')} for job in jobs_by_company.get(row['id'], [])]
            fingerprint = hashlib.sha256(json.dumps([row, jobs_by_company.get(row['id'], [])],
                sort_keys=True).encode()).hexdigest()
            payload['snapshot_fingerprint'] = fingerprint
            research = combine_research(jobs_by_company.get(row['id'], []))
            if previous and previous.payload.get('snapshot_fingerprint') == fingerprint:
                counts['unchanged'] += 1
                continue
            counts['updated' if previous else 'created'] += 1
            counts['with_research'] += bool(research)
            if not apply:
                continue
            # Keep fields edited since the last seed import, assignments and all commercial relations.
            protected = {}
            if previous:
                for field in ('name', 'sector', 'city', 'address', 'website'):
                    value = getattr(previous.enterprise, field)
                    old = previous.payload.get(field, '')
                    if value and value != old[:Enterprise._meta.get_field(field).max_length]:
                        protected[field] = value
            enterprise, _ = import_seed_record(payload, payload)
            for field, value in protected.items():
                setattr(enterprise, field, value)
            for field, source in [('rccm', 'rccm'), ('nif', 'tax_number')]:
                if not getattr(enterprise, field) and payload['identifiers'].get(source):
                    setattr(enterprise, field, payload['identifiers'][source][:100])
            if research:
                # Preserve any newer attributable observation already collected in Onbora.
                old = enterprise.scraped_data or {}
                research = combine_research([
                    {'id': 'snapshot', 'result': json.dumps(research)},
                    {'id': 'current', 'result': json.dumps(old)}])
                enterprise.scraped_data = research
            enterprise.save()
            persist_enterprise_document(enterprise)
            if research:
                from .ingestion import _publish_news
                _publish_news(enterprise, research, supported_facts(research))
        if not apply:
            transaction.set_rollback(True)
    return dict(counts)
