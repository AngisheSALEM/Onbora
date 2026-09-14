from __future__ import annotations

import logging
from typing import Any, Dict
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .rag_service import get_catalog_rag
from .pre_call.models import PreCallInput
from .post_call.models import PostCallInput
from .lead_scoring.models import LeadScoringInput
from .churn_radar.models import ChurnRadarInput
from .sales_enrichment.models import SalesEnrichmentInput
from .services.session_service import AISessionService
from .tools.crm_tools import get_available_ai_tools
from .unified_engine import get_unified_core_ai

logger = logging.getLogger(__name__)


class AIHealthView(APIView):
    """Vérification de santé et statut du copilote Onbora Core AI."""
    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        core_ai = get_unified_core_ai()
        return Response({
            "status": "healthy",
            "service": "Onbora Core AI In-Process",
            "model": core_ai.model_name,
            "has_api_key": bool(core_ai.api_key),
            "rag_available": True,
        })


class AICatalogSearchView(APIView):
    """Recherche multicritère RAG avec index inversé et scoring TF-IDF."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        query = request.data.get("query", "").strip()
        limit = int(request.data.get("limit", 5))
        if not query:
            return Response({"error": "Paramètre 'query' obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        results = get_catalog_rag().search(query=query, limit=limit)
        return Response({"query": query, "count": len(results), "results": results})


class AICatalogServiceDetailView(APIView):
    """Détail exhaustif d'un service officiel Orange Business."""
    permission_classes = [AllowAny]

    def get(self, request, service_id: str) -> Response:
        svc = get_catalog_rag().get_service_by_id(service_id)
        if not svc:
            return Response({"error": f"Service '{service_id}' introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"service": svc})


class AIPreCallView(APIView):
    """Génération du dossier d'attaque Pre-Call avant visite client."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        try:
            inp = PreCallInput(**request.data)
            engine = get_unified_core_ai().pre_call_engine
            res = engine.generate(inp)
            return Response(res.model_dump())
        except Exception as exc:
            logger.error("[AIPreCallView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AIPostCallView(APIView):
    """Génération de l'email commercial, CRM payload et tâches post-visite."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        try:
            inp = PostCallInput(**request.data)
            engine = get_unified_core_ai().post_call_engine
            res = engine.generate(inp)
            return Response(res.model_dump())
        except Exception as exc:
            logger.error("[AIPostCallView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AILeadScoringView(APIView):
    """Évaluation B2B Lead Scoring avec barème stratégique Orange."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        try:
            inp = LeadScoringInput(**request.data)
            engine = get_unified_core_ai().lead_scoring_engine
            res = engine.evaluate(inp)
            return Response(res.model_dump())
        except Exception as exc:
            logger.error("[AILeadScoringView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AIChurnRadarView(APIView):
    """Détection préventive d'attrition et plan d'action rétention sous 48h."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        try:
            inp = ChurnRadarInput(**request.data)
            engine = get_unified_core_ai().churn_radar_engine
            res = engine.analyze(inp)
            return Response(res.model_dump())
        except Exception as exc:
            logger.error("[AIChurnRadarView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AISalesEnrichmentView(APIView):
    """Génération d'hypothèses commerciales basées sur le scraping web."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        try:
            inp = SalesEnrichmentInput(**request.data)
            engine = get_unified_core_ai().sales_enrichment_engine
            res = engine.generate(inp)
            return Response(res.model_dump())
        except Exception as exc:
            logger.error("[AISalesEnrichmentView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AIAnalyzeConversationView(APIView):
    """Analyse conversationnelle avec persistance de session et alerte HITL."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        session_id = request.data.get("session_id", "default_session")
        client_name = request.data.get("client_name", "Compte B2B")
        conversation = request.data.get("conversation", "").strip()

        if not conversation:
            return Response({"error": "Champ 'conversation' requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = AISessionService.analyze_and_record(
                session_id=session_id, client_name=client_name, transcript=conversation
            )
            return Response(result)
        except Exception as exc:
            logger.error("[AIAnalyzeConversationView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIValidateActionView(APIView):
    """Enregistrement de l'approbation ou du rejet humain d'une action IA."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        session_id = request.data.get("session_id", "default_session")
        decision = request.data.get("decision", "pending")
        comment = request.data.get("comment", "")

        try:
            session = AISessionService.validate_action(session_id=session_id, decision=decision, comment=comment)
            return Response({
                "session_id": session.session_id,
                "status": "validated_by_human" if decision in {"approved", "rejected"} else "pending",
                "decision": session.decision_status,
                "comment": session.validation_comment,
            })
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AISessionDetailView(APIView):
    """Consultation de la mémoire persistante d'une session IA."""
    permission_classes = [AllowAny]

    def get(self, request, session_id: str) -> Response:
        session = AISessionService.get_or_create_session(session_id)
        return Response({
            "session_id": session.session_id,
            "client_name": session.client_name,
            "summary": session.summary,
            "decision_status": session.decision_status,
            "human_validation_required": session.human_validation_required,
            "validation_comment": session.validation_comment,
            "messages_count": len(session.messages or []),
            "reports_count": len(session.reports or []),
            "messages": session.messages,
            "reports": session.reports,
            "updated_at": session.updated_at.isoformat(),
        })


class AIToolsListView(APIView):
    """Exposition des outils et connecteurs CRM disponibles pour l'IA."""
    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        return Response({"tools": get_available_ai_tools()})
