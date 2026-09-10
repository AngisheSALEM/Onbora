from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from django.conf import settings

from .common.base_engine import BaseAIEngine
from .pre_call.service import PreCallIntelligenceEngine
from .pre_call.models import PreCallInput
from .post_call.service import PostCallExecutionEngine
from .post_call.models import PostCallInput
from .sales_enrichment.service import SalesEnrichmentEngine
from .sales_enrichment.models import SalesEnrichmentInput
from .lead_scoring.service import B2BLeadScoringEngine
from .lead_scoring.models import LeadScoringInput
from .churn_radar.service import ChurnRadarEngine
from .churn_radar.models import ChurnRadarInput

logger = logging.getLogger(__name__)


class UnifiedCoreAIEngine:
    """
    Facade unifiee d'orchestration pour Onbora Core AI.
    Centralise l'acces aux moteurs specialises modulaires :
    1. PreCallIntelligenceEngine   (briefing avant RDV)
    2. PostCallExecutionEngine     (compte-rendu, mail et CRM post-RDV)
    3. SalesEnrichmentEngine       (hypotheses et analyse scraping terrain)
    4. B2BLeadScoringEngine        (hierarchisation du pipeline)
    5. ChurnRadarEngine            (detection d'attrition et retention)
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', '')
        self.model_name = model_name or getattr(settings, 'GEMINI_MODEL', 'gemini-3.5-flash-lite')
        if 'gemini-2.5' in self.model_name:
            self.model_name = 'gemini-3.5-flash-lite'

        # Instanciation modulaire propre
        self.base_engine = BaseAIEngine(api_key=self.api_key, model_name=self.model_name)
        self.pre_call_engine = PreCallIntelligenceEngine(api_key=self.api_key, model_name=self.model_name)
        self.post_call_engine = PostCallExecutionEngine(api_key=self.api_key, model_name=self.model_name)
        self.sales_enrichment_engine = SalesEnrichmentEngine(api_key=self.api_key, model_name=self.model_name)
        self.lead_scoring_engine = B2BLeadScoringEngine(api_key=self.api_key, model_name=self.model_name)
        self.churn_radar_engine = ChurnRadarEngine(api_key=self.api_key, model_name=self.model_name)

    @property
    def _client(self):
        """Propriete de compatibilite avec les inspections d'etat."""
        return self.base_engine._client

    def _call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """Delegation directe au moteur commun d'inférence."""
        return self.base_engine.call_gemini_json(prompt, system_instruction=system_instruction)

    # -------------------------------------------------------------------------
    # 1. PRE-CALL BRIEFING
    # -------------------------------------------------------------------------
    def generate_pre_call_briefing(self, enterprise: Any, kam_user: Any) -> dict:
        inp = PreCallInput(
            company_name=enterprise.name,
            sector=enterprise.sector or "Services & Industrie",
            locations_count=enterprise.site_count or 1,
            website_url=enterprise.website or None,
            annual_revenue=float(enterprise.annual_revenue or 50000.0),
            current_operator=enterprise.current_operator,
            current_connectivity=enterprise.current_connectivity,
            known_context=f"Compte suivi par {kam_user.get_full_name() or kam_user.username}. Contact : {enterprise.contact_name or 'Direction'}."
        )
        out = self.pre_call_engine.generate(inp)
        res = out.model_dump()
        # Enrichissement du budget estime
        rev = float(enterprise.annual_revenue or 50000.0)
        res["company_overview"]["annual_revenue_usd"] = f"{rev:,.0f} USD"
        res["company_overview"]["estimated_sites"] = enterprise.site_count or 1
        res["company_overview"]["telecom_budget_monthly_usd"] = round(rev * 0.015 / 12, 2)
        return res

    # -------------------------------------------------------------------------
    # 2. POST-CALL EXECUTION
    # -------------------------------------------------------------------------
    def generate_post_call_execution(self, enterprise: Any, kam_user: Any, meeting_transcript: str) -> dict:
        kam_name = kam_user.get_full_name() or kam_user.username if kam_user else "Commercial"
        inp = PostCallInput(
            kam_name=kam_name,
            client_name=enterprise.contact_name or "Direction",
            client_role=enterprise.contact_role or "DSI",
            company_name=enterprise.name,
            meeting_transcript=meeting_transcript or f"Entretien commercial avec {enterprise.name}."
        )
        out = self.post_call_engine.generate(inp)
        res = out.model_dump()
        # Normalisation pour retro-compatibilite avec les vues KAM
        rev = float(getattr(enterprise, 'annual_revenue', 50000) or 50000)
        res["crm_payload"]["deal_size_estimate_usd"] = round(rev * 0.012, 2)
        res["crm_payload"]["account_name"] = enterprise.name
        return res

    # -------------------------------------------------------------------------
    # 3. SALES HYPOTHESES & ENRICHMENT
    # -------------------------------------------------------------------------
    def generate_sales_hypotheses(
        self,
        company_name: str,
        sector: str = "Services B2B",
        website: Optional[str] = None,
        scraped_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        inp = SalesEnrichmentInput(
            company_name=company_name,
            sector=sector,
            website=website,
            scraped_data=scraped_data or {}
        )
        out = self.sales_enrichment_engine.generate(inp)
        return out.model_dump()

    # -------------------------------------------------------------------------
    # 4. POST-VISIT REPORT
    # -------------------------------------------------------------------------
    def generate_post_visit_report(
        self,
        full_transcript: str,
        enterprise_name: str,
        prep_objective: str = "",
        salesperson_name: str = "Commercial Terrain"
    ) -> Dict[str, Any]:
        inp = PostCallInput(
            kam_name=salesperson_name,
            client_name="Direction",
            client_role="Décideur",
            company_name=enterprise_name,
            meeting_transcript=full_transcript or f"Objectif : {prep_objective}"
        )
        out = self.post_call_engine.generate(inp)
        return {
            "executive_summary": out.executive_summary,
            "confirmed_needs": out.confirmed_needs,
            "objections_raised": out.objections_raised,
            "actions_todo": [t.task for t in out.action_tasks],
            "follow_up_email": out.client_followup_email.body
        }

    # -------------------------------------------------------------------------
    # 5. LEAD SCORING B2B
    # -------------------------------------------------------------------------
    def evaluate_lead_scoring(self, enterprise: Any) -> dict:
        inp = LeadScoringInput(
            company_name=enterprise.name,
            sector=enterprise.sector,
            locations_count=enterprise.site_count or 1,
            budget_status=f"CA annuel : {enterprise.annual_revenue or 'N/A'}",
            competitor_contract_expiry="Non renseigne",
            decision_maker_involved=bool(enterprise.contact_name),
            raw_notes=enterprise.conversion_notes or ""
        )
        out = self.lead_scoring_engine.evaluate(inp)
        return out.model_dump()

    # -------------------------------------------------------------------------
    # 6. CHURN RADAR & RETENTION
    # -------------------------------------------------------------------------
    def analyze_churn_radar(self, enterprise: Any) -> dict:
        inp = ChurnRadarInput(
            company_name=enterprise.name,
            current_services=[enterprise.current_connectivity or "Fibre Pro"],
            recent_interactions_notes=enterprise.conversion_notes or f"Client sous contrat {enterprise.current_operator or 'Orange'}.",
            unresolved_incidents_count=1 if enterprise.current_operator != 'Orange' else 0,
        )
        out = self.churn_radar_engine.analyze(inp)
        return out.model_dump()


# Singleton applicatif Core AI unifié
_ENGINE = None


def get_unified_core_ai() -> UnifiedCoreAIEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = UnifiedCoreAIEngine()
    return _ENGINE
