"""Database-backed discovery queue with bounded retries and recoverable leases."""
import logging
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework.exceptions import Throttled

from ..models import AIDiscoveryJob

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
LEASE_DURATION = timedelta(minutes=10)


def enqueue_discovery(user, query):
    with transaction.atomic():
        # Serialize quota checks for this owner across web workers.
        get_user_model().objects.select_for_update().get(pk=user.pk)
        active = AIDiscoveryJob.objects.filter(owner=user, status__in=["pending", "running"])
        existing = active.filter(query=query).first()
        if existing:
            return existing
        if active.count() >= 3:
            raise Throttled(detail="Trois recherches sont déjà en attente ou en cours.")
        return AIDiscoveryJob.objects.create(owner=user, query=query)


def claim_job():
    now = timezone.now()
    eligible = Q(status="pending") | Q(status="running", lease_expires_at__lt=now)
    AIDiscoveryJob.objects.filter(eligible, attempts__gte=MAX_ATTEMPTS).update(
        status="failed", error_code="attempts_exhausted", lease_token=None, lease_expires_at=None)
    # Conditional UPDATE gives a single winner even without skip_locked (SQLite tests).
    for pk in AIDiscoveryJob.objects.filter(eligible, attempts__lt=MAX_ATTEMPTS).order_by("created_at").values_list("pk", flat=True)[:20]:
        token = uuid.uuid4()
        changed = AIDiscoveryJob.objects.filter(eligible, pk=pk, attempts__lt=MAX_ATTEMPTS).update(
            status="running", attempts=F("attempts") + 1, lease_token=token,
            lease_expires_at=now + LEASE_DURATION, updated_at=now)
        if changed:
            return AIDiscoveryJob.objects.get(pk=pk, lease_token=token)
    return None


def process_next_job():
    from ..market_intel.service import MarketIntelService
    job = claim_job()
    if job is None:
        return False
    owned = AIDiscoveryJob.objects.filter(pk=job.pk, lease_token=job.lease_token, status="running")

    def heartbeat():
        if owned.update(lease_expires_at=timezone.now() + LEASE_DURATION, updated_at=timezone.now()) != 1:
            raise RuntimeError("discovery_lease_lost")

    try:
        result = MarketIntelService().run_discovery(query=job.query, heartbeat=heartbeat)
        owned.update(status="failed" if result.get("errors") else "succeeded", result=result,
                     error_code="partial_discovery_failure" if result.get("errors") else "",
                     lease_token=None, lease_expires_at=None, updated_at=timezone.now())
    except Exception:
        logger.exception("Discovery job %s failed", job.pk)
        owned.update(status="pending" if job.attempts < MAX_ATTEMPTS else "failed",
                     error_code="discovery_failed", lease_token=None,
                     lease_expires_at=None, updated_at=timezone.now())
    return True
