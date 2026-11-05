"""Apply a completed observation to its explicit account, preserving CRM and manual edits."""
from django.db import transaction
from django.utils import timezone

from sales.models import Enterprise
from ..models import CompanyResearchJob
from .adapter import supported_facts
from .http_client import ResearchError, validate_contract


def validate_target(job, data):
    validate_contract("ResearchJob", data)
    if data["schema_version"] != "2.0":
        raise ResearchError("invalid_research_version")
    result = data.get("result")
    if result is None:
        return
    expected = job.request_data["subject"]
    subject = result["subject"]
    if any(subject.get(key) != value for key, value in expected.items()):
        raise ResearchError("research_target_mismatch")
    indexes = {kind: {item["id"]: item for item in result[kind]}
               for kind in ("facts", "evidence", "sources")}
    if any(len(indexes[kind]) != len(result[kind]) for kind in indexes):
        raise ResearchError("research_duplicate_references")
    for capture in result["evidence"]:
        source = indexes["sources"].get(capture["source_id"])
        if not source or source["access_status"] != "accessible":
            raise ResearchError("research_invalid_evidence")
    for item in [result["identity"], *result["facts"]]:
        if not set(item["evidence_ids"]).issubset(indexes["evidence"]):
            raise ResearchError("research_unresolved_evidence")
    for item in [*result["summary"]["sentences"], *result["contradictions"]]:
        if not set(item["fact_ids"]).issubset(indexes["facts"]):
            raise ResearchError("research_unresolved_facts")
    for field, entry in result["profile"].items():
        if any(fid not in indexes["facts"] or indexes["facts"][fid]["field"] != field
               for fid in entry["fact_ids"]):
            raise ResearchError("research_invalid_profile")


def apply_completed_research(claimed, data):
    from kam.models import PreCallBriefing
    from kam.commercial_intelligence_service import CommercialIntelligenceService
    with transaction.atomic():
        job = CompanyResearchJob.objects.select_for_update().get(pk=claimed.pk)
        if job.lease_token != claimed.lease_token or job.state not in ("queued", "running"):
            return
        enterprise = Enterprise.objects.select_for_update().get(pk=job.enterprise_id)
        result = data["result"]
        facts = supported_facts(result)
        job.application_status = "no_supported_facts"
        if facts:
            # A cached observation must not overwrite a more recent completed observation.
            newer = CompanyResearchJob.objects.filter(enterprise=enterprise, applied_at__isnull=False,
                created_at__gt=job.created_at).exists()
            if not newer:
                enterprise.scraped_data = result
                enterprise.last_sync_date = timezone.now()
                enterprise.save(update_fields=["scraped_data", "last_sync_date"])
                brief = PreCallBriefing.objects.select_for_update().filter(
                    enterprise=enterprise, kam=job.owner).first()
                if brief and brief.updated_at > job.created_at:
                    job.application_status = "preserved_manual_edits"
                else:
                    CommercialIntelligenceService.generate_pre_call_briefing(enterprise, job.owner)
                    job.application_status = "applied"
                _publish_news(enterprise, result, facts)
            else:
                job.application_status = "skipped_older_request"
        job.remote_job_id, job.state = data["job_id"], "completed"
        job.response_data, job.applied_at = data, timezone.now()
        job.lease_token, job.lease_expires_at = None, None
        job.error_code = ""
        from kam.services.analysis_signal_ingestion import retain_analysis_signals
        retain_analysis_signals(job, data)
        job.save()


def _publish_news(enterprise, result, facts):
    from kam.models import B2BNewsFeedItem
    news = [fact for fact in facts if fact["field"] == "news"]
    if not news:
        return
    evidence = {item["id"]: item for item in result["evidence"]}
    sources = {item["id"]: item for item in result["sources"]}
    for fact in news:
        source = sources[evidence[fact["evidence_ids"][0]]["source_id"]]
        B2BNewsFeedItem.objects.get_or_create(enterprise=enterprise,
            title=fact["statement"][:255], source_url=source["url"], defaults={
                "summary": fact["statement"], "source_name": source["publisher"][:100],
                "priority": "NORMAL", "signal_strength": "WEAK", "signal_score": 0,
                "signal_rationale": "Information sourcée ; impact commercial à qualifier.",
                "discovered_signals": [fact], "published_at": timezone.now()})
