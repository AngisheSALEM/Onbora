"""One bounded HTTP operation per tick, with persistent scheduling and fenced leases."""
import uuid
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from ..models import CompanyResearchJob
from .http_client import ResearchError, ResearchHTTPClient
from .jobs import ACTIVE


def claim_research():
    now = timezone.now()
    eligible = Q(state__in=ACTIVE, next_poll_at__lte=now) & (
        Q(lease_expires_at__isnull=True) | Q(lease_expires_at__lt=now))
    for pk in CompanyResearchJob.objects.filter(eligible).order_by("next_poll_at").values_list("pk", flat=True)[:20]:
        token = uuid.uuid4()
        if CompanyResearchJob.objects.filter(eligible, pk=pk).update(
                lease_token=token, lease_expires_at=now + timedelta(seconds=60)):
            return CompanyResearchJob.objects.select_related("enterprise", "owner").get(pk=pk, lease_token=token)
    return None


def process_next_research(client=None):
    job = claim_research()
    if job is None:
        return False
    owned = CompanyResearchJob.objects.filter(pk=job.pk, lease_token=job.lease_token, state__in=ACTIVE)
    try:
        if timezone.now() - job.created_at > timedelta(minutes=5):
            raise ResearchError("research_deadline_exceeded")
        from ..access import visible_enterprises
        if not job.owner.is_active or not visible_enterprises(job.owner).filter(pk=job.enterprise_id).exists():
            raise ResearchError("research_access_revoked")
        client = client or ResearchHTTPClient()
        # The stable local UUID survives an unknown POST response and worker restarts.
        data, delay = (client.get(job.remote_job_id) if job.remote_job_id else
                       client.create(job.request_data, str(job.pk)))
        if job.remote_job_id and data["job_id"] != job.remote_job_id:
            raise ResearchError("research_job_mismatch")
        from .ingestion import validate_target
        validate_target(job, data)
        if data["state"] == "completed":
            from .ingestion import apply_completed_research
            apply_completed_research(job, data)
        else:
            owned.update(state=data["state"], remote_job_id=data["job_id"], response_data=data,
                next_poll_at=timezone.now() + timedelta(seconds=delay), error_count=0,
                error_code=(data.get("error") or {}).get("code", ""),
                lease_token=None, lease_expires_at=None, updated_at=timezone.now())
    except ResearchError as exc:
        retries = job.error_count + 1
        owned.update(state=job.state if exc.retryable and retries < 3 else "failed",
            error_count=retries, error_code=exc.code,
            next_poll_at=timezone.now() + timedelta(seconds=exc.retry_after),
            lease_token=None, lease_expires_at=None, updated_at=timezone.now())
    except Exception:
        # Do not log provider bodies, credentials, or application records.
        owned.update(state="failed", error_code="research_processing_failed",
            lease_token=None, lease_expires_at=None, updated_at=timezone.now())
    return True
