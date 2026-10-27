from __future__ import annotations

import logging
import os
from typing import Any, Dict
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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


class AIAudioTranscribeView(APIView):
    """
    POST /api/ai/transcribe/ — Transcription audio via Google Gemini.

    Accepte un fichier audio multipart (champ 'audio').
    Retourne la transcription brute en JSON.

    Utilisé par :
    - Le frontend web Next.js (client B2B, dictaphone commercial)
    - L'application mobile Flutter en mode fallback réseau
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request) -> Response:
        from django.core.files.storage import FileSystemStorage

        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response(
                {"detail": "Parametre 'audio' obligatoire (fichier multipart)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        MAX_SIZE = 25 * 1024 * 1024  # 25 Mo
        if audio_file.size > MAX_SIZE:
            return Response(
                {"detail": "Fichier trop volumineux. Taille maximale : 25 Mo."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        language = request.data.get("language", "fr")

        import tempfile
        with tempfile.NamedTemporaryFile(
            suffix=os.path.splitext(audio_file.name)[1] or ".webm",
            delete=False,
        ) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            from .services.audio_transcription_service import transcribe_audio_with_gemini
            result = transcribe_audio_with_gemini(tmp_path, language=language)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        if not result.get("success"):
            return Response(
                {
                    "success": False,
                    "text": "",
                    "error": result.get("error", "Transcription echouee."),
                    "provider": result.get("provider", "gemini-audio"),
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return Response({
            "success": True,
            "text": result["text"],
            "language": result.get("language", language),
            "provider": result.get("provider", "gemini-audio"),
        }, status=status.HTTP_200_OK)


class AIVectorSearchView(APIView):
    """Recherche semantique dans la base de connaissances Onbora."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        from .vector_search.singleton import get_vector_search_service

        query = request.data.get("query", "").strip()
        n_results = int(request.data.get("n_results", 5))
        doc_type = request.data.get("doc_type", None)

        if not query:
            return Response({"error": "Parametre 'query' obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            results = get_vector_search_service().search(
                query=query,
                n_results=n_results,
                doc_type_filter=doc_type,
            )
            return Response({
                "query": query,
                "count": len(results),
                "results": [
                    {
                        "doc_id": r.doc_id,
                        "title": r.title,
                        "doc_type": r.doc_type,
                        "content": r.content[:500],
                        "score": r.score,
                        "metadata": r.metadata,
                    }
                    for r in results
                ],
            })
        except Exception as exc:
            logger.error("[AIVectorSearchView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIEnterpriseSimilarView(APIView):
    """Trouve des entreprises similaires pour upsell/cross-sell."""
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        from .vector_search.singleton import get_vector_search_service

        enterprise_id = request.data.get("enterprise_id")
        query_text = request.data.get("query_text", "").strip()
        top_k = int(request.data.get("top_k", 10))
        service_filter = request.data.get("service_not_having", None)

        try:
            svc = get_vector_search_service()
            if enterprise_id:
                if service_filter:
                    results = svc.find_upsell_candidates(
                        enterprise_id=enterprise_id,
                        service_not_having=service_filter,
                        top_k=top_k,
                    )
                else:
                    results = svc.find_similar_enterprises(enterprise_id=enterprise_id, top_k=top_k)
            elif query_text:
                results = svc.search(
                    query=query_text,
                    n_results=top_k,
                    doc_type_filter="enterprise_profile",
                )
            else:
                return Response(
                    {"error": "Fournir 'enterprise_id' ou 'query_text'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response({
                "count": len(results),
                "results": [
                    {
                        "doc_id": r.doc_id,
                        "title": r.title,
                        "doc_type": r.doc_type,
                        "composite_score": r.score,
                        "metadata": r.metadata,
                        "upsell_service": getattr(r, "upsell_service", None),
                    }
                    for r in results
                ],
            })
        except Exception as exc:
            logger.error("[AIEnterpriseSimilarView] Erreur : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIMarketIntelDiscoverView(APIView):
    """Lance un job de decouverte de nouveaux prospects via veille web."""
    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        import threading
        from .market_intel.service import MarketIntelService

        query = request.data.get("query", "").strip()
        if not query:
            return Response({"error": "Parametre 'query' obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        def _run():
            try:
                MarketIntelService().run_discovery(query=query)
            except Exception as exc:
                logger.error("[AIMarketIntelDiscoverView] Erreur dans le thread discovery : %s", exc)

        t = threading.Thread(target=_run, daemon=True)
        t.start()

        return Response({"status": "started", "query": query})


class AIVectorReindexView(APIView):
    """Relance l'indexation vectorielle du dataset complet."""
    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        from .vector_search.singleton import get_vector_search_service

        try:
            count = get_vector_search_service().reindex()
            return Response({"status": "done", "indexed": count})
        except Exception as exc:
            logger.error("[AIVectorReindexView] Erreur reindex : %s", exc)
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
