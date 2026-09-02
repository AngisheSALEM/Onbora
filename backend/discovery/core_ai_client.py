from __future__ import annotations

import logging
import time
import uuid
from typing import Dict, Any, Optional

from apps.ai_core.providers import build_chat_model
from apps.ai_core.services.conversation import ConversationService, ServiceError

logger = logging.getLogger(__name__)


def _get_service() -> ConversationService:
    return ConversationService(model=build_chat_model())


def is_core_ai_available() -> bool:
    """Core AI is directly integrated in-memory in the Django backend."""
    return True


def call_core_ai_turn(
    conversation_id: int, message: str, idempotency_key: str = ""
) -> Optional[Dict[str, Any]]:
    """Execute a conversation turn in-memory via Didier's ConversationService."""
    if not idempotency_key:
        idempotency_key = f"turn-{conversation_id}-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"

    try:
        service = _get_service()
        result = service.process_conversation_turn(
            conversation_id=conversation_id,
            text=message,
            idempotency_key=idempotency_key,
        )
        return {
            "assistant_message": result.assistant_message,
            "next_question": result.assistant_message,
            "readiness": {
                "is_ready": result.ready_for_analysis,
                "reason": result.readiness_reason,
            },
            "profile_patch": result.profile.model_dump(mode="json") if result.profile else None,
        }
    except Exception as exc:
        logger.exception(f"[CoreAI In-Memory Turn Error] {exc}")
        return None


def call_core_ai_quick_match(
    sector: str,
    needs: list,
    locations: list,
    company_name: str = "Entreprise",
    size: int = 20,
    activities: list | None = None,
    constraints: list | None = None,
) -> Optional[Dict[str, Any]]:
    """Perform quick profile matching & business twin generation in-memory."""
    try:
        from django.conf import settings
        from apps.ai_core.catalog import load_catalog
        from apps.ai_core.contracts.profile import CompanyProfile, CompanyProfilePatch, Fact, FactStatus
        from apps.ai_core.domain import merge_profile, recommend_services
        from apps.reports.services import ReportBuilder

        catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        
        def _make_fact(val: Any) -> Fact:
            return Fact(value=val, status=FactStatus.CONFIRMED, confidence=1.0, requires_confirmation=False, source_refs=["quick_match"])

        patch = CompanyProfilePatch(
            name=_make_fact(company_name or "Entreprise"),
            sector=_make_fact(sector or "Services B2B"),
            size=_make_fact(size or 20),
            activities=[_make_fact(a) for a in (activities or [])],
            locations=[_make_fact(loc) for loc in (locations or ["Kinshasa"])],
            needs=[_make_fact(n) for n in (needs or [])],
            constraints=[_make_fact(c) for c in (constraints or [])],
        )
        
        profile = merge_profile(CompanyProfile(), patch, catalog=catalog)
        recommendations = recommend_services(profile, catalog)
        builder = ReportBuilder(catalog)
        twin_bundle = builder.build_business_twin(profile, recommendations)

        return {
            "recommendations": recommendations.model_dump(mode="json"),
            "business_twin": twin_bundle.report.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.exception(f"[CoreAI In-Memory QuickMatch Error] {exc}")
        return None


