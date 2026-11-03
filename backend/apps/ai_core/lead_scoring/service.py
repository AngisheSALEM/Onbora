from __future__ import annotations

import logging
from typing import List
from ..common.base_engine import BaseAIEngine
from ..common.catalog_guard import build_catalog_context_prompt
from .models import (
    ConversionProbability,
    DriverType,
    LeadScoringInput,
    LeadScoringOutput,
    ScoreDriver,
    ScoringTier,
)
from .prompts import LEAD_SCORING_SYSTEM_PROMPT, build_lead_scoring_user_prompt

logger = logging.getLogger(__name__)


class B2BLeadScoringEngine(BaseAIEngine):
    """
    Moteur 3 : B2B Lead Scoring Engine.
    Evalue et classe les prospects dans le pipeline commercial.
    """

    def evaluate(self, input_data: LeadScoringInput) -> LeadScoringOutput:
        catalog_offers = build_catalog_context_prompt(
            catalog_context=input_data.orange_catalog_context,
            query=f"{input_data.company_name} {input_data.sector}",
        )
        user_prompt = build_lead_scoring_user_prompt(input_data, catalog_offers)

        ai_res = self.call_gemini_json(user_prompt, system_instruction=LEAD_SCORING_SYSTEM_PROMPT)
        if ai_res:
            try:
                return LeadScoringOutput.model_validate(ai_res)
            except Exception as exc:
                logger.warning("[LeadScoring] Erreur validation schema Pydantic (%s), bascule fallback.", exc)

        return self._build_fallback(input_data)

    def _build_fallback(self, input_data: LeadScoringInput) -> LeadScoringOutput:
        """An auditable rule score; unknown fields never become positive evidence."""
        import unicodedata
        def normalized(value):
            return "".join(c for c in unicodedata.normalize("NFKD", value or "")
                           if not unicodedata.combining(c)).lower()

        score = 20
        drivers = []
        def add(points, factor):
            nonlocal score
            score += points
            drivers.append(ScoreDriver(factor=factor, impact=f"{points:+d} pts",
                                       type=DriverType.POSITIVE if points >= 0 else DriverType.NEGATIVE))
        budget = normalized(input_data.budget_status)
        if any(term in budget for term in ("non confirme", "non valide", "bloque", "gele", "refuse")):
            add(-10, "Budget explicitement non confirmé ou bloqué")
        elif any(term in budget for term in ("confirme", "valide", "confirmed", "disponible")):
            add(25, "Budget déclaré confirmé")
        pain = normalized(input_data.pain_level)
        if pain in {"high", "critical", "elevee", "eleve", "critique"}:
            add(20, "Criticité déclarée élevée")
        elif pain in {"medium", "modere", "moderee"}:
            add(10, "Criticité déclarée modérée")
        if input_data.decision_maker_involved:
            add(15, "Décideur déclaré impliqué")
        sites = input_data.locations_count or 1
        if sites > 1:
            add(min(15, sites * 3), f"Compte déclaré multisite ({sites} sites)")
        score = max(0, min(100, score))
        if score >= 70:
            tier, probability = ScoringTier.TIER_1_PRIORITY, ConversionProbability.HIGH
        elif score >= 40:
            tier, probability = ScoringTier.TIER_2_MEDIUM, ConversionProbability.MEDIUM
        else:
            tier, probability = ScoringTier.TIER_3_NURTURING, ConversionProbability.LOW
        return LeadScoringOutput(
            lead_score=score, scoring_tier=tier, conversion_probability=probability,
            score_drivers=drivers,
            recommended_sales_angle="Qualifier les usages, contraintes et services déjà installés avant de proposer une offre.",
            next_immediate_action="Confirmer le budget, le décideur et les besoins lors d'un entretien de découverte.")
