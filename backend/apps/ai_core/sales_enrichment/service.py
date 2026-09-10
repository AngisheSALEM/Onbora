from __future__ import annotations

import logging
from typing import List
from ..common.base_engine import BaseAIEngine
from ..common.catalog_guard import build_catalog_context_prompt
from .models import SalesEnrichmentInput, SalesEnrichmentOutput
from .prompts import SALES_ENRICHMENT_SYSTEM_PROMPT, build_sales_enrichment_user_prompt

logger = logging.getLogger(__name__)


class SalesEnrichmentEngine(BaseAIEngine):
    """
    Moteur de generation d'hypotheses commerciales et d'enrichissement avant-visite.
    """

    def generate(self, input_data: SalesEnrichmentInput) -> SalesEnrichmentOutput:
        catalog_offers = build_catalog_context_prompt(
            catalog_context=input_data.orange_catalog_context,
            query=f"{input_data.company_name} {input_data.sector}",
        )
        user_prompt = build_sales_enrichment_user_prompt(input_data, catalog_offers)

        ai_res = self.call_gemini_json(user_prompt, system_instruction=SALES_ENRICHMENT_SYSTEM_PROMPT)
        if ai_res:
            try:
                ai_res["provider"] = f"Gemini ({self.model_name})"
                return SalesEnrichmentOutput.model_validate(ai_res)
            except Exception as exc:
                logger.warning("[SalesEnrichment] Erreur validation schema Pydantic (%s), bascule fallback.", exc)

        return self._build_fallback(input_data)

    def _build_fallback(self, input_data: SalesEnrichmentInput) -> SalesEnrichmentOutput:
        company = input_data.company_name
        sector_lower = input_data.sector.lower() if input_data.sector else ""

        hypotheses = [
            f"L'entreprise {company} s'appuie probablement sur une liaison internet instable generant des ralentissements quotidiens.",
            "La collaboration interne et les partages de fichiers souffrent d'un manque d'outils securises et centralises."
        ]
        pitch = f"Presenter la Fibre Optique Dediee Pro Orange avec garantie GTR 4h et le pack Microsoft 365 Business."
        questions = [
            "Quelle est la criticite d'une coupure internet sur l'activite quotidienne de vos equipes ?",
            "Combien de collaborateurs doivent travailler simultanement sur vos applications centrales ?",
            "Comment sauvegardez-vous actuellement les donnees critiques de vos clients ?"
        ]
        objections = [
            "Le cout de la fibre pro est superieur a une offre grand public (Reponse : ROI immediat sur la continuite et zero perte de CA).",
            "La crainte des delais d'installation (Reponse : Passerelle de secours 4G activee immediatement sans interruption)."
        ]
        solution = "Fibre Optique Pro 50M + Microsoft 365"
        score = 85

        if any(k in sector_lower for k in ["santé", "clinique", "médic", "hôpital"]):
            hypotheses = [
                f"{company} traite des donnees medicales sensibles necessitant un debit permanent et une sauvegarde certifiee.",
                "Besoin de continuite absolue pour les dossiers patients et la tele-consultation."
            ]
            pitch = "Proposer la Fibre Pro Securisee couplee a la Sauvegarde Cloud et la Telephonie IP d'accueil."
            solution = "Fibre Pro Securisee + Cloud Backup HDS"
            score = 92
        elif any(k in sector_lower for k in ["mine", "industr", "logist", "transport"]):
            hypotheses = [
                f"{company} requiert une interconnexion multi-sites robuste reliant sieges et implantations eloignees.",
                "Besoin de supervision 24/7 et de redondance Satellite / Fibre."
            ]
            pitch = "Deployer notre solution SD-WAN hybride Manage avec double adduction Fibre et secours Satellite."
            solution = "SD-WAN Manage Hybride Fibre + Satellite"
            score = 88

        return SalesEnrichmentOutput(
            hypotheses=hypotheses,
            tailored_pitch=pitch,
            key_questions=questions,
            potential_objections=objections,
            recommended_solution=solution,
            conversion_score=score,
            provider="Core-AI-Offline-Engine"
        )
