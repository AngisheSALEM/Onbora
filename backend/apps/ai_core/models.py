from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
from pydantic import ValidationError as PydanticValidationError

from .contracts import CompanyProfile, RecommendationResult, TurnResult


class Conversation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    state_version = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=Role.choices)
    content = models.TextField(max_length=20_000)
    idempotency_key = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    error_code = models.CharField(max_length=80, blank=True)
    result_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "idempotency_key"], name="unique_message_idempotency_key"
            )
        ]
        ordering = ["created_at", "id"]

    def clean(self) -> None:
        if self.status == self.Status.COMPLETED and self.role == self.Role.USER:
            try:
                TurnResult.model_validate(self.result_data)
            except PydanticValidationError as exc:
                raise ValidationError({"result_data": str(exc)}) from exc

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class CompanyProfileSnapshot(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="profile_snapshots"
    )
    version = models.PositiveIntegerField()
    schema_version = models.CharField(max_length=20, default="1.0")
    data = models.JSONField()
    content_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "version"], name="unique_profile_snapshot_version"
            )
        ]
        ordering = ["version"]

    def clean(self) -> None:
        try:
            profile = CompanyProfile.model_validate(self.data)
        except PydanticValidationError as exc:
            raise ValidationError({"data": str(exc)}) from exc
        if profile.schema_version != self.schema_version:
            raise ValidationError({"schema_version": "does not match profile data"})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class RecommendationRecord(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="recommendation_records"
    )
    profile_snapshot = models.ForeignKey(
        CompanyProfileSnapshot, on_delete=models.CASCADE, related_name="recommendation_records"
    )
    catalog_version = models.CharField(max_length=64)
    input_fingerprint = models.CharField(max_length=64)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["profile_snapshot", "input_fingerprint"],
                name="unique_recommendation_fingerprint",
            )
        ]

    def clean(self) -> None:
        try:
            result = RecommendationResult.model_validate(self.data)
        except PydanticValidationError as exc:
            raise ValidationError({"data": str(exc)}) from exc
        if result.catalog_version != self.catalog_version:
            raise ValidationError({"catalog_version": "does not match recommendation data"})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class AIExecution(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="ai_executions"
    )
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="ai_executions", null=True, blank=True
    )
    purpose = models.CharField(max_length=50)
    provider = models.CharField(max_length=80)
    model_name = models.CharField(max_length=160)
    prompt_version = models.CharField(max_length=64)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    input_tokens = models.PositiveIntegerField(null=True, blank=True)
    output_tokens = models.PositiveIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["conversation", "purpose", "created_at"])]


class AISessionMemory(models.Model):
    """
    Gestionnaire de mémoire persistante PostgreSQL pour les sessions de copilote IA.
    Remplace le stockage précaire de fichiers JSON sur disque local (memory_store.py).
    Supporte la boucle Human-in-the-Loop et l'historique conversationnel multi-tours.
    """

    class DecisionStatus(models.TextChoices):
        PENDING = "pending", "En attente"
        APPROVED = "approved", "Validé"
        REJECTED = "rejected", "Rejeté"

    session_id = models.CharField(max_length=120, unique=True, db_index=True)
    # Legacy sessions stay unowned and cannot be claimed through the API.
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                              on_delete=models.CASCADE, related_name="ai_sessions")
    state_version = models.PositiveIntegerField(default=0)
    client_name = models.CharField(max_length=255, default="Compte B2B")
    summary = models.TextField(blank=True, default="")
    messages = models.JSONField(default=list, blank=True)
    reports = models.JSONField(default=list, blank=True)
    decision_status = models.CharField(
        max_length=20, choices=DecisionStatus.choices, default=DecisionStatus.PENDING
    )
    validation_comment = models.TextField(blank=True, default="")
    human_validation_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Session Mémoire IA"
        verbose_name_plural = "Sessions Mémoires IA"

    def __str__(self) -> str:
        return f"{self.session_id} - {self.client_name} ({self.decision_status})"


class AIDiscoveryJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="ai_discovery_jobs")
    query = models.CharField(max_length=500)
    status = models.CharField(max_length=16, default="pending", db_index=True,
                              choices=[(s, s) for s in ("pending", "running", "succeeded", "failed")])
    attempts = models.PositiveSmallIntegerField(default=0)
    lease_token = models.UUIDField(null=True, blank=True)
    lease_expires_at = models.DateTimeField(null=True, blank=True)
    result = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AIVectorDocument(models.Model):
    """Database overlay shared by web and ingestion processes; vectors are derived locally."""
    doc_id = models.CharField(primary_key=True, max_length=160)
    document = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)


class AIMarketSignalReceipt(models.Model):
    """Idempotency key committed in the same transaction as the resulting feed item."""
    fingerprint = models.CharField(primary_key=True, max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)


class CompanyResearchJob(models.Model):
    """Durable association between an authorized Onbora request and a remote v2 job."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="company_research_jobs")
    enterprise = models.ForeignKey("sales.Enterprise", on_delete=models.CASCADE,
                                   related_name="research_jobs")
    idempotency_key = models.CharField(max_length=128)
    request_data = models.JSONField(default=dict)
    remote_job_id = models.CharField(max_length=80, blank=True)
    state = models.CharField(max_length=16, default="queued", db_index=True,
        choices=[(s, s) for s in ("queued", "running", "completed", "failed", "cancelled")])
    response_data = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    error_count = models.PositiveSmallIntegerField(default=0)
    next_poll_at = models.DateTimeField(default=timezone.now)
    lease_token = models.UUIDField(null=True, blank=True)
    lease_expires_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    application_status = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["owner", "idempotency_key"],
                                               name="unique_company_research_request")]
