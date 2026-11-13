"""Enqueue requests without network I/O and expose only owner-authorized local IDs."""
import re
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import APIException, Throttled, ValidationError

from ..models import CompanyResearchJob
from .http_client import ResearchError, validate_contract

ACTIVE = ("queued", "running")


class ResearchConflict(APIException):
    status_code = 409
    default_detail = "Cette demande a déjà été utilisée pour une autre recherche."


def request_payload(enterprise, operation="research", baseline=None, fields=None):
    subject = {"name": enterprise.name, "country_code": settings.ONBORA_RESEARCH_COUNTRY_CODE}
    if enterprise.city:
        subject["city"] = enterprise.city
    if enterprise.website:
        subject["website"] = enterprise.website
    identifiers = {key: value for key, value in (
        ('rccm', enterprise.rccm), ('tax_number', enterprise.nif)) if value}
    if identifiers:
        subject['identifiers'] = identifiers
    payload = {"subject": subject, "language": "fr", "operation": operation,
        "question": "Quelles sont les activités, implantations, coordonnées et actualités publiques de cette entreprise ?",
        "requested_fields": ["description", "activities", "locations", "business_contacts", "identifiers",
                             "news", "products_services", "projects_partnerships"]}
    if fields is not None:
        payload["requested_fields"] = fields
    if baseline:
        payload["baseline_job_id"] = baseline
    try:
        validate_contract("ResearchRequest", payload)
    except ResearchError:
        raise ValidationError("Vérifiez le nom, le site et les identifiants enregistrés sur la fiche entreprise.") from None
    return payload


def enqueue_research(user, enterprise, key=None, operation="research", baseline_id=None, fields=None):
    if operation not in ("research", "enrich", "refresh"):
        raise ValidationError("Opération de recherche invalide.")
    key = key or str(uuid.uuid4())
    if not isinstance(key, str) or not re.fullmatch(r"[!-~]{1,128}", key):
        raise ValidationError("Identifiant de demande invalide.")
    baseline = None
    if baseline_id:
        try:
            baseline_id = uuid.UUID(str(baseline_id))
        except (ValueError, TypeError):
            raise ValidationError("Recherche de référence invalide.") from None
        baseline = CompanyResearchJob.objects.filter(pk=baseline_id, owner=user,
            enterprise=enterprise, state="completed").first()
        if baseline is None:
            raise ValidationError("Recherche de référence introuvable.")
    payload = request_payload(enterprise, operation, baseline.remote_job_id if baseline else None, fields)
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        previous = CompanyResearchJob.objects.filter(owner=user, idempotency_key=key).first()
        if previous:
            if previous.enterprise_id != enterprise.pk or previous.request_data != payload:
                raise ResearchConflict()
            return previous
        active = CompanyResearchJob.objects.filter(owner=user, state__in=ACTIVE)
        previous = active.filter(enterprise=enterprise, request_data=payload).first()
        if previous:
            return previous
        if active.count() >= 3:
            raise Throttled(detail="Trois recherches sont déjà en attente ou en cours.")
        return CompanyResearchJob.objects.create(owner=user, enterprise=enterprise,
            idempotency_key=key, request_data=payload)


def serialize_research(job):
    return {"id": str(job.id), "state": job.state, "enterprise_id": job.enterprise_id,
        "status_url": f"/api/ai/research/jobs/{job.id}/", "retry_after": 2,
        "outcome": (job.response_data.get("result") or {}).get("outcome"),
        "error_code": job.error_code, "application_status": job.application_status,
        "result": job.response_data.get("result") if job.state == "completed" else None}


def latest_research(user, enterprise):
    job = CompanyResearchJob.objects.filter(owner=user, enterprise=enterprise).first()
    return serialize_research(job) if job else None
