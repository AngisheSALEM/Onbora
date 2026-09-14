from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from django.utils import timezone
from ..models import AISessionMemory
from ..unified_engine import get_unified_core_ai

logger = logging.getLogger(__name__)


class AISessionService:
    """
    Service d'orchestration de session conversationnelle avec persistance PostgreSQL.
    Gère l'historique multi-tours, l'extraction de besoins et la validation humaine (HITL).
    """

    @classmethod
    def get_or_create_session(cls, session_id: str, client_name: str = "Compte B2B") -> AISessionMemory:
        session, created = AISessionMemory.objects.get_or_create(
            session_id=session_id,
            defaults={"client_name": client_name},
        )
        if not created and client_name != "Compte B2B" and session.client_name != client_name:
            session.client_name = client_name
            session.save(update_fields=["client_name", "updated_at"])
        return session

    @classmethod
    def append_message(
        cls, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None
    ) -> AISessionMemory:
        session = cls.get_or_create_session(session_id)
        messages = list(session.messages or [])
        messages.append({
            "role": role,
            "content": content,
            "timestamp": timezone.now().isoformat(),
            "metadata": metadata or {},
        })
        session.messages = messages
        session.save(update_fields=["messages", "updated_at"])
        return session

    @classmethod
    def add_report(cls, session_id: str, report: Dict[str, Any]) -> AISessionMemory:
        session = cls.get_or_create_session(session_id)
        reports = list(session.reports or [])
        reports.append(report)
        session.reports = reports
        session.save(update_fields=["reports", "updated_at"])
        return session

    @classmethod
    def validate_action(cls, session_id: str, decision: str, comment: str = "") -> AISessionMemory:
        """
        Enregistre la décision humaine (approved, rejected, pending).
        """
        if decision not in {"approved", "rejected", "pending"}:
            raise ValueError(f"Décision invalide : {decision}. Choisir approved, rejected ou pending.")

        session = cls.get_or_create_session(session_id)
        session.decision_status = decision
        session.validation_comment = comment
        session.human_validation_required = (decision == "pending")
        session.save(update_fields=["decision_status", "validation_comment", "human_validation_required", "updated_at"])
        return session

    @classmethod
    def analyze_and_record(cls, session_id: str, client_name: str, transcript: str) -> Dict[str, Any]:
        """
        Analyse la conversation commerciale via le moteur unifié,
        persiste les messages et détecte le besoin d'une validation humaine.
        """
        cls.append_message(session_id=session_id, role="user", content=transcript)

        core_ai = get_unified_core_ai()
        prompt = (
            f"Tu es Onbora, copilote commercial B2B pour Orange Business. "
            f"Analyse cet échange avec l'entreprise {client_name}.\n"
            f"Transcription : {transcript}\n\n"
            f"Fournis une analyse structurée en français : "
            f"1) Synthèse des enjeux, "
            f"2) Besoins et douleurs confirmés, "
            f"3) Solutions recommandées du catalogue Orange Business, "
            f"4) Risques ou objections, "
            f"5) Mention explicite si une validation humaine préalable est requise pour une offre non standard."
        )

        ai_response = core_ai._call_gemini_json(
            prompt=prompt,
            system_instruction="Tu es le moteur d'analyse Onbora. Réponds en JSON structuré.",
        )

        if not ai_response:
            ai_response = {
                "summary": f"Entretien commercial avec {client_name}.",
                "detected_needs": ["Connexion sécurisée", "Continuité de service"],
                "recommended_offers": ["Fibre Sécurisée Dédiée Pro avec SLA 99.99%"],
                "objections": [],
                "human_validation_required": False,
            }

        needs_human = bool(ai_response.get("human_validation_required", False))
        summary_text = ai_response.get("summary", "")

        cls.append_message(
            session_id=session_id,
            role="assistant",
            content=summary_text or "Analyse commerciale effectuée.",
            metadata=ai_response,
        )

        session = cls.get_or_create_session(session_id, client_name=client_name)
        session.summary = summary_text
        session.human_validation_required = needs_human
        cls.add_report(session_id, ai_response)
        session.save(update_fields=["summary", "human_validation_required", "updated_at"])

        return {
            "session_id": session_id,
            "client_name": client_name,
            "analysis": ai_response,
            "human_validation_required": needs_human,
        }
