"""
Account Memory & Handover Pack Service
======================================
Domaine : KAM (PME & Grands Comptes) — Epic 5
Rôle : Consignation immuable des événements majeurs de la vie du compte
(décisions stratégiques, promesses commerciales, litiges SLA) et génération
automatique du dossier de passation (Handover Pack) lors des rotations de portefeuille.
"""

from typing import Dict, Any, List, Optional
from django.utils import timezone
from sales.models import Enterprise, AccountPortfolioAssignment, AccountProjection, Evidence
from kam.models import AccountMemoryEvent, RelationshipCoverage, KamVisitReport
from kam.services.radar_service import SignalRuleEvaluator


class AccountMemoryService:
    @classmethod
    def record_event(
        cls,
        enterprise_id: int,
        user: Any,
        event_type: str,
        summary: str,
        details: str,
        occurred_at: Optional[Any] = None,
        evidence_id: Optional[str] = None,
        is_critical: bool = False
    ) -> AccountMemoryEvent:
        """Enregistre un événement immuable dans la mémoire du compte."""
        enterprise = Enterprise.objects.get(id=enterprise_id)
        evidence = Evidence.objects.filter(id=evidence_id).first() if evidence_id else None

        return AccountMemoryEvent.objects.create(
            enterprise=enterprise,
            created_by=user if getattr(user, 'is_authenticated', False) else None,
            event_type=event_type,
            summary=summary,
            details=details,
            occurred_at=occurred_at or timezone.now(),
            evidence=evidence,
            is_critical=is_critical
        )

    @classmethod
    def generate_handover_pack(
        cls,
        enterprise_id: int,
        outgoing_kam: Optional[Any] = None,
        incoming_kam: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Génère un dossier de passation complet (Handover Pack) prêt à l'emploi :
        1. Fiche d'identité et projection CRM maître.
        2. Registre de mémoire de compte (décisions, promesses et incidents).
        3. Cartographie relationnelle et détection des points de défaillance.
        4. Signaux radar de risque et renouvellements à anticiper.
        """
        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return {"error": f"Entreprise #{enterprise_id} introuvable."}

        # 1. Événements de mémoire
        memory_events = list(
            AccountMemoryEvent.objects.filter(enterprise=enterprise)
            .select_related('created_by', 'evidence')
            .order_by('-occurred_at')
        )

        decisions = [e for e in memory_events if e.event_type == 'DECISION']
        promises = [e for e in memory_events if e.event_type == 'PROMISE']
        incidents = [e for e in memory_events if e.event_type == 'INCIDENT']
        critical_alerts = [e for e in memory_events if e.is_critical]

        # 2. Cartographie d'influence
        stakeholders = list(
            RelationshipCoverage.objects.filter(enterprise=enterprise)
            .select_related('last_interaction_proof')
            .order_by('-influence_level')
        )

        # 3. Projection CRM
        crm_proj = AccountProjection.objects.filter(enterprise=enterprise).first()

        # 4. Signaux de risque actifs
        signals_data = SignalRuleEvaluator.evaluate_account_signals(enterprise.id)

        now = timezone.now()

        return {
            "handover_title": f"Dossier de Passation Stratégique — {enterprise.name}",
            "generated_at": now.strftime("%d/%m/%Y %H:%M"),
            "outgoing_kam": outgoing_kam.get_full_name() or outgoing_kam.username if outgoing_kam else "Non spécifié",
            "incoming_kam": incoming_kam.get_full_name() or incoming_kam.username if incoming_kam else "En cours d'affectation",
            "enterprise": {
                "id": enterprise.id,
                "name": enterprise.name,
                "segment": enterprise.segment,
                "sector": enterprise.sector,
                "city": enterprise.city,
                "annual_revenue": float(enterprise.annual_revenue or 0.0),
                "contract_end_date": enterprise.contract_end_date.strftime("%d/%m/%Y") if enterprise.contract_end_date else "Non renseignée",
                "crm_account_id": crm_proj.crm_account_id if crm_proj else enterprise.crm_id or "Non synchronisé"
            },
            "executive_summary": (
                f"Compte {enterprise.segment} opéré dans le secteur {enterprise.sector}. "
                f"{len(promises)} promesse(s) commerciale(s) en cours, {len(incidents)} incident(s) consigné(s), "
                f"et {len(stakeholders)} interlocuteur(s) référencé(s)."
            ),
            "critical_watchpoints": [
                {
                    "summary": e.summary,
                    "details": e.details,
                    "date": e.occurred_at.strftime("%d/%m/%Y"),
                    "author": e.created_by.username if e.created_by else "Système"
                }
                for e in critical_alerts
            ],
            "active_promises": [
                {
                    "promise": p.summary,
                    "details": p.details,
                    "made_at": p.occurred_at.strftime("%d/%m/%Y"),
                    "has_evidence": p.evidence is not None
                }
                for p in promises
            ],
            "strategic_decisions": [
                {
                    "decision": d.summary,
                    "details": d.details,
                    "date": d.occurred_at.strftime("%d/%m/%Y")
                }
                for d in decisions
            ],
            "stakeholders_map": [
                {
                    "name": s.contact_name,
                    "role": s.contact_role,
                    "classification": s.get_role_classification_display(),
                    "influence": s.get_influence_level_display(),
                    "status": s.get_coverage_status_display(),
                    "is_mono_champion": s.is_mono_champion_risk
                }
                for s in stakeholders
            ],
            "risk_signals": signals_data.get("signals", []),
            "overall_risk_level": signals_data.get("risk_level", "HEALTHY"),
        }
