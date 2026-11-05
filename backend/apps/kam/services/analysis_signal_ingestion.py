"""Persist supported Research API v2 facts without promoting provider prose to evidence."""
import hashlib
import json
import unicodedata
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from kam.models import AnalysisSignal, AnalysisSignalObservation, AnalysisSignalRun
from sales.models import Enterprise


def observation_time(value, fallback):
    try:
        parsed = parse_datetime(value) if isinstance(value, str) else None
    except ValueError:
        parsed = None
    if parsed is None:
        return fallback
    return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed


def fact_fingerprint(fact):
    """Provider IDs and source URLs may change between runs; the attributable fact stays the same."""
    value = fact.get('normalized_value')
    if value is None:
        value = fact.get('value')
    if isinstance(value, str):
        value = ' '.join(unicodedata.normalize('NFKC', value).casefold().split())
    canonical = [fact['field'], fact.get('kind'), value, fact.get('valid_at')]
    return hashlib.sha256(json.dumps(canonical, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def classify_fact(fact):
    # Field labels are faithful to the v2 contract. Do not infer an expansion from an existing office.
    return {'activities': 'ACTIVITY', 'locations': 'LOCATION', 'business_contacts': 'CONTACT',
            'projects_partnerships': 'PROJECT', 'news': 'NEWS', 'identifiers': 'IDENTITY',
            'products_services': 'OFFER', 'description': 'DESCRIPTION'}.get(fact['field'], 'OTHER')


def sourced_payload(fact, result):
    evidence = {item['id']: item for item in result.get('evidence', [])}
    sources = {item['id']: item for item in result.get('sources', [])}
    source_ids = {evidence[key]['source_id'] for key in fact['evidence_ids'] if key in evidence}
    citations = [{key: sources[source_id].get(key) for key in
                  ('url', 'title', 'publisher', 'source_type', 'relationship', 'collected_at', 'published_at')}
                 for source_id in sorted(source_ids) if source_id in sources]
    legacy = 'original_legacy_fact' in fact
    return {'fact': fact, 'sources': citations, 'identity_status': result['identity']['status'],
            'categorization': 'legacy_field_mapping' if legacy else 'research_field_v2',
            'provenance': 'legacy_account_snapshot' if legacy else 'research_api_v2'}


@transaction.atomic
def retain_analysis_signals(job, data):
    from apps.ai_core.company_analysis.adapter import supported_facts
    from apps.ai_core.company_analysis.ingestion import validate_target
    validate_target(job, data)
    if data.get('state') != 'completed' or not data.get('result'):
        return None
    # Serialize competing runs for an enterprise, also during historical backfill.
    enterprise = Enterprise.objects.select_for_update().get(pk=job.enterprise_id)
    observed_at = observation_time(data.get('completed_at'), job.applied_at or timezone.now())
    result = data['result']
    run, created = AnalysisSignalRun.objects.get_or_create(origin_job_id=job.pk, defaults={
        'job': job, 'enterprise': enterprise, 'sector': ' '.join((enterprise.sector or '').split()) or 'Secteur non renseigné',
        'observed_at': observed_at, 'recorded_at': job.applied_at or timezone.now(),
        'outcome': result.get('outcome', ''),
    })
    if not created:
        return run
    for fact in supported_facts(result):
        _retain_fact(enterprise, run, fact, result)
    return run


def _retain_fact(enterprise, run, fact, result, confidence_override=None):
    # Detection is the completed research observation, never the publication/event date.
    # Preserve the provider's original fact timestamp separately in the immutable payload.
    seen_at = run.observed_at
    valid_at = fact.get('valid_at')
    event_date = None
    if isinstance(valid_at, str):
        try:
            event_date = parse_date(valid_at) or (parse_datetime(valid_at).date() if parse_datetime(valid_at) else None)
        except ValueError:
            pass
    fingerprint = fact_fingerprint(fact)
    signal = AnalysisSignal.objects.filter(enterprise=enterprise, fingerprint=fingerprint).first()
    if signal is None:
        # Old snapshots lack normalized values. Reuse only an exactly matching statement
        # and event date when crossing formats, preserving its ID and the KAM's review.
        matching = AnalysisSignal.objects.filter(enterprise=enterprise, title__iexact=fact['statement'],
            category=classify_fact(fact), event_date=event_date)
        if confidence_override != 'LEGACY_REVIEW':
            matching = matching.filter(observations__confidence='LEGACY_REVIEW')
        signal = matching.order_by('first_seen', 'pk').first()
    created = signal is None
    if created:
        signal = AnalysisSignal.objects.create(enterprise=enterprise, fingerprint=fingerprint,
            title=fact['statement'], category=classify_fact(fact), sector=run.sector,
            first_seen=seen_at, last_seen=seen_at, event_date=event_date,
        )
    if not created:
        if seen_at < signal.first_seen:
            signal.first_seen, signal.sector = seen_at, run.sector
        signal.last_seen = max(signal.last_seen, seen_at)
        signal.save(update_fields=['first_seen', 'last_seen', 'sector'])
    confidence = confidence_override or ('IDENTITY_UNCERTAIN' if result['identity']['status'] != 'confirmed' else
                  'CORROBORATED' if fact.get('support_status') == 'corroborated' else 'SUPPORTED')
    AnalysisSignalObservation.objects.get_or_create(signal=signal, run=run, defaults={
        'observed_at': seen_at, 'confidence': confidence, 'payload': sourced_payload(fact, result)})
