from __future__ import annotations

import json
from typing import Any
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.ai_core.contracts import CompanyProfile, RecommendationResult
from apps.ai_core.models import Conversation
from apps.ai_core.providers import build_chat_model
from apps.ai_core.services.conversation import ConversationService, ServiceError
from apps.reports.models import GeneratedReport


def _service() -> ConversationService:
    return ConversationService(model=build_chat_model())


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok", "service": "onbora-core-ai"})


@csrf_exempt
@require_http_methods(["POST"])
def create_conversation(request: HttpRequest) -> JsonResponse:
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = {}
    metadata = data.get("metadata", {"source": "api_client"})
    conversation = _service().create_conversation(metadata=metadata)
    return JsonResponse({
        "conversation_id": conversation.pk,
        "created_at": conversation.created_at.isoformat(),
        "status": conversation.status,
    }, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def process_turn(request: HttpRequest, conversation_id: int) -> JsonResponse:
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "JSON body invalid"}, status=400)

    user_message = data.get("message", "").strip()
    idempotency_key = data.get("idempotency_key", "")
    if not user_message:
        return JsonResponse({"error": "message is required"}, status=400)

    try:
        result = _service().process_conversation_turn(conversation_id, user_message, idempotency_key)
        next_q = result.next_questions[0] if result.next_questions else result.assistant_message
        return JsonResponse({
            "assistant_message": result.assistant_message,
            "next_question": next_q,
            "readiness": {
                "is_ready": result.ready_for_analysis,
                "reason": result.readiness_reason,
            },
            "profile_patch": result.profile.model_dump() if result.profile else None,
        })
    except ServiceError as exc:
        return JsonResponse({"error": exc.code}, status=400)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def analyze_conversation(request: HttpRequest, conversation_id: int) -> JsonResponse:
    try:
        result = _service().analyze_conversation(conversation_id)
        snapshot = Conversation.objects.get(pk=conversation_id).profile_snapshots.order_by("-version").first()
        profile = CompanyProfile.model_validate(snapshot.data) if snapshot else None
        
        return JsonResponse({
            "company_profile": profile.model_dump() if profile else None,
            "recommendations": result.model_dump() if result else None,
        })
    except ServiceError as exc:
        return JsonResponse({"error": exc.code}, status=400)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_report(request: HttpRequest, conversation_id: int) -> JsonResponse:
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = {}
    report_type = data.get("report_type", "kam")
    try:
        report = _service().generate_report(conversation_id, report_type)
        return JsonResponse({
            "report_id": report.pk,
            "report_type": report.report_type,
            "title": report.title,
            "data": report.data,
        })
    except ServiceError as exc:
        return JsonResponse({"error": exc.code}, status=400)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def quick_match(request: HttpRequest) -> JsonResponse:
    """Stateless scoring & matching against catalog."""
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "JSON body invalid"}, status=400)

    service = _service()
    conversation = service.create_conversation(metadata={"source": "quick_match"})
    
    sector = data.get("sector", "Services aux entreprises")
    name = data.get("company_name", "Entreprise Prospect")
    size = data.get("size", 20)
    activities = data.get("activities", [])
    locations = data.get("locations", ["Kinshasa"])
    needs = data.get("needs", [])
    constraints = data.get("constraints", [])

    try:
        service.confirm_company_profile(
            conversation.pk,
            name=name,
            sector=sector,
            size=size,
            activities=activities,
            locations=locations,
            needs=needs,
            constraints=constraints,
        )
        rec_result = service.analyze_conversation(conversation.pk)
        twin_report = service.generate_report(conversation.pk, "business_twin")
        
        return JsonResponse({
            "conversation_id": conversation.pk,
            "recommendations": rec_result.model_dump(),
            "business_twin": twin_report.data,
        })
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)
