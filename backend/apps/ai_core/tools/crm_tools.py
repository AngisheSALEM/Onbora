from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from ..rag_service import get_catalog_rag

logger = logging.getLogger(__name__)


def search_catalog_tool(query: str, limit: int = 4) -> List[Dict[str, Any]]:
    """
    Recherche les offres officielles Orange Business pertinentes selon le besoin exprimé.
    Utilise le moteur RAG TF-IDF in-process avec scoring de pertinence.
    """
    rag = get_catalog_rag()
    return rag.search(query, limit=limit)


def get_enterprise_profile_tool(company_name: str) -> Dict[str, Any]:
    """
    Interroge l'ORM Django pour extraire la fiche CRM réelle de l'entreprise :
    secteur, opérateur actuel, chiffre d'affaires, contact et niveau de douleur.
    """
    try:
        from sales.models import Enterprise
        ent = Enterprise.objects.filter(name__icontains=company_name).first()
        if not ent:
            return {"status": "not_found", "message": f"Aucun compte trouvé pour {company_name}"}

        return {
            "status": "found",
            "id": ent.id,
            "name": ent.name,
            "sector": ent.sector,
            "current_operator": ent.current_operator,
            "current_connectivity": ent.current_connectivity,
            "annual_revenue": float(ent.annual_revenue or 0),
            "site_count": ent.site_count or 1,
            "contact_name": ent.contact_name,
            "contact_role": ent.contact_role,
            "pain_level": ent.pain_level,
            "incident_count": ent.incident_count,
        }
    except Exception as exc:
        logger.error("[Tools] Erreur interrogation Enterprise : %s", exc)
        return {"status": "error", "error": str(exc)}


def get_recent_tickets_and_notes_tool(company_name: str) -> Dict[str, Any]:
    """
    Extrait l'historique récent des comptes-rendus de visite KAM et des retours terrain
    depuis PostgreSQL pour enrichir l'analyse pré-call ou la rétention.
    """
    try:
        from sales.models import Enterprise
        ent = Enterprise.objects.filter(name__icontains=company_name).first()
        if not ent:
            return {"status": "not_found", "notes": []}

        notes: List[str] = []
        if getattr(ent, "conversion_notes", None):
            notes.append(f"Notes commerciales : {ent.conversion_notes}")

        if hasattr(ent, "kam_visit_reports"):
            for r in ent.kam_visit_reports.all()[:3]:
                notes.append(f"Visite KAM ({r.created_at.strftime('%d/%m/%Y')}) : {r.executive_summary}")

        return {
            "status": "ok",
            "company_name": ent.name,
            "incident_count": ent.incident_count,
            "notes": notes,
        }
    except Exception as exc:
        logger.error("[Tools] Erreur interrogation tickets/notes : %s", exc)
        return {"status": "error", "error": str(exc)}


def request_human_validation_tool(reason: str, required_action: str) -> Dict[str, Any]:
    """
    Déclenche un point d'arrêt Human-in-the-Loop lorsqu'une décision commerciale critique,
    une offre hors catalogue ou une remise importante est détectée.
    """
    return {
        "status": "human_validation_required",
        "reason": reason,
        "required_action": required_action,
        "message": "Action soumise à la validation préalable d'un superviseur ou KAM.",
    }


def get_available_ai_tools() -> List[Dict[str, Any]]:
    """Expose la liste des outils disponibles pour inspection ou déclarations d'agent."""
    return [
        {
            "name": "search_catalog_tool",
            "description": "Recherche RAG dans le catalogue Orange Business.",
            "parameters": {"query": "str", "limit": "int"},
        },
        {
            "name": "get_enterprise_profile_tool",
            "description": "Extrait la fiche CRM réelle d'une entreprise depuis PostgreSQL.",
            "parameters": {"company_name": "str"},
        },
        {
            "name": "get_recent_tickets_and_notes_tool",
            "description": "Extrait l'historique des visites KAM et incidents récents.",
            "parameters": {"company_name": "str"},
        },
        {
            "name": "request_human_validation_tool",
            "description": "Exige une validation humaine pour une décision critique.",
            "parameters": {"reason": "str", "required_action": "str"},
        },
    ]
