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
        self.model_name = model_name or getattr(settings, 'GEMINI_MODEL', 'gemini-3.6-flash')
        if 'gemini-2.5' in self.model_name:
            self.model_name = 'gemini-3.6-flash'

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
    # 5. LEAD SCORING B2B & CHURN RADAR DATA EXTRACTOR
    # -------------------------------------------------------------------------
    def _extract_enterprise_notes(self, enterprise: Any) -> str:
        """Consolide l'ensemble des retours terrain, comptes-rendus et observations sur le compte."""
        notes = []
        if getattr(enterprise, 'conversion_notes', None):
            notes.append(f"Notes commerciales : {enterprise.conversion_notes}")
        
        # Rapports KAM récents
        if hasattr(enterprise, 'kam_visit_reports'):
            try:
                reports = sorted(enterprise.kam_visit_reports.all(), key=lambda x: x.created_at, reverse=True)[:3]
                for r in reports:
                    part = f"Rapport KAM ({r.created_at.strftime('%d/%m/%Y')}) : {r.executive_summary or ''}"
                    if r.confirmed_needs:
                        part += f" | Besoins : {', '.join(r.confirmed_needs)}"
                    if r.objections_raised:
                        part += f" | Objections : {', '.join(r.objections_raised)}"
                    notes.append(part)
            except Exception:
                pass

        # Retours terrain commerciaux SOHO
        if hasattr(enterprise, 'field_intelligence_reports'):
            try:
                firs = sorted(enterprise.field_intelligence_reports.all(), key=lambda x: x.created_at, reverse=True)[:2]
                for fir in firs:
                    if fir.nurturing_notes:
                        notes.append(f"Feedback terrain : {fir.nurturing_notes}")
            except Exception:
                pass

        # Briefing pre-call existant
        if hasattr(enterprise, 'pre_call_briefings'):
            try:
                briefings = sorted(enterprise.pre_call_briefings.all(), key=lambda x: x.created_at, reverse=True)
                if briefings and briefings[0].detected_business_challenges:
                    notes.append(f"Défis business identifiés : {', '.join(briefings[0].detected_business_challenges)}")
            except Exception:
                pass

        return "\n".join(notes) if notes else "Compte suivi par l'équipe commerciale Orange Business B2B."

    def evaluate_lead_scoring(self, enterprise: Any) -> dict:
        rev = float(getattr(enterprise, 'annual_revenue', 0) or 0)
        telecom_budget = float(getattr(enterprise, 'telecom_budget_monthly', 0) or (rev * 0.015 / 12 if rev > 0 else 2500.0))
        budget_label = getattr(enterprise, 'budget_status', '') or 'Non précisé'
        if budget_label != 'Non précisé':
            budget_str = f"{budget_label} (Budget mensuel estimé : {telecom_budget:,.0f} USD, CA annuel : {rev:,.0f} USD)"
        else:
            budget_str = f"CA annuel : {rev:,.0f} USD, Budget télécom mensuel estimé : {telecom_budget:,.0f} USD"

        # Échéance du contrat concurrent
        contract_end = getattr(enterprise, 'contract_end_date', None)
        if contract_end:
            expiry_str = f"Échéance au {contract_end.strftime('%d/%m/%Y')}"
        else:
            expiry_str = "Non renseignée"

        # Décideur impliqué
        contact_name = getattr(enterprise, 'contact_name', '') or ''
        contact_role = (getattr(enterprise, 'contact_role', '') or '').upper()
        decision_maker = bool(contact_name) and any(
            t in contact_role for t in ['DG', 'DIRECTEUR', 'DSI', 'DAF', 'GÉRANT', 'GERANT', 'HEAD', 'VP', 'CIO', 'CEO']
        )

        raw_notes = self._extract_enterprise_notes(enterprise)
        curr_op = getattr(enterprise, 'current_operator', 'Non renseigné') or 'Non renseigné'
        curr_conn = getattr(enterprise, 'current_connectivity', 'N/A') or 'N/A'
        pain = getattr(enterprise, 'pain_level', 'Modéré') or 'Modéré'
        incidents = getattr(enterprise, 'incident_count', 0) or 0

        extended_notes = f"{raw_notes}\n[Contexte Télécoms] Opérateur actuel : {curr_op} ({curr_conn}). Niveau de frustration : {pain}. Incidents non résolus : {incidents}."

        inp = LeadScoringInput(
            company_name=enterprise.name,
            sector=getattr(enterprise, 'sector', 'Services B2B') or "Services B2B",
            locations_count=getattr(enterprise, 'site_count', 1) or 1,
            budget_status=budget_str,
            pain_level=pain,
            competitor_contract_expiry=expiry_str,
            decision_maker_involved=decision_maker,
            raw_notes=extended_notes
        )
        out = self.lead_scoring_engine.evaluate(inp)
        res = out.model_dump()

        # Normalisation pour le frontend et le KAM Office
        tier = res.get("scoring_tier", "TIER_2_PROSPECT")
        if tier == "TIER_2_MEDIUM":
            tier = "TIER_2_PROSPECT"
        res["scoring_tier"] = tier

        formatted_drivers = []
        for d in res.get("score_drivers", []):
            formatted_drivers.append({
                "factor": d.get("factor", ""),
                "points": d.get("impact", "+10 pts"),
                "positive": d.get("type", "POSITIVE") == "POSITIVE",
            })
        res["score_drivers"] = formatted_drivers
        res["estimated_mrr_usd"] = round(telecom_budget, 2)
        res["recommended_approach"] = res.get("recommended_sales_angle", "")
        return res

    # -------------------------------------------------------------------------
    # 6. CHURN RADAR & RETENTION
    # -------------------------------------------------------------------------
    def analyze_churn_radar(self, enterprise: Any) -> dict:
        rev = float(getattr(enterprise, 'annual_revenue', 0) or 0)
        telecom_budget = float(getattr(enterprise, 'telecom_budget_monthly', 0) or (rev * 0.015 / 12 if rev > 0 else 2500.0))
        contract_end = getattr(enterprise, 'contract_end_date', None)
        contract_end_str = contract_end.strftime('%Y-%m-%d') if contract_end else None

        incidents = getattr(enterprise, 'incident_count', 0) or 0
        curr_op = getattr(enterprise, 'current_operator', 'Orange') or 'Orange'
        curr_conn = getattr(enterprise, 'current_connectivity', 'Fibre Pro') or 'Fibre Pro'
        pain = getattr(enterprise, 'pain_level', 'Modéré') or 'Modéré'

        # Services actuels
        services = [curr_conn]
        conv_offer = getattr(enterprise, 'converted_offer', None)
        if conv_offer and conv_offer not in services:
            services.append(conv_offer)

        raw_notes = self._extract_enterprise_notes(enterprise)
        notes = f"{raw_notes}\n[Audit Opérateur] Fournisseur : {curr_op}. Niveau de risque : {pain}. Incidents récents non résolus : {incidents}."

        inp = ChurnRadarInput(
            company_name=enterprise.name,
            current_services=services,
            recent_interactions_notes=notes,
            unresolved_incidents_count=incidents,
            contract_end_date=contract_end_str,
        )
        out = self.churn_radar_engine.analyze(inp)
        res = out.model_dump()

        # Normalisation pour affichage radar KAM
        res["enterprise_id"] = enterprise.id
        res["enterprise_name"] = enterprise.name
        res["sector"] = getattr(enterprise, 'sector', 'Grand Compte') or "Grand Compte"
        res["at_stake_monthly_revenue_usd"] = round(telecom_budget, 2)
        res["signals_detected"] = res.get("churn_reasons", [])
        retention = res.get("retention_plan", {})
        res["retention_action_plan"] = {
            "urgency": retention.get("urgency", "IMMEDIATE_48H"),
            "action": retention.get("action", "Organiser un point de gouvernance"),
            "recommended_talk_track": retention.get("email_draft", "")
        }
        return res


# Singleton applicatif Core AI unifié
_ENGINE = None


def get_unified_core_ai() -> UnifiedCoreAIEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = UnifiedCoreAIEngine()
    return _ENGINE
