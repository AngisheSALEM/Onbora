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
        score = 50
        drivers: List[ScoreDriver] = []

        budget = (input_data.budget_status or "").lower()
        if any(w in budget for w in ["validé", "confirmé", "disponible", "dispo"]):
            score += 25
            drivers.append(ScoreDriver(
                factor="Budget télécoms validé pour la période en cours",
                impact="+25 pts",
                type=DriverType.POSITIVE,
            ))
        elif any(w in budget for w in ["non", "bloqué", "refus"]):
            score -= 20
            drivers.append(ScoreDriver(
                factor="Budget non débloqué",
                impact="-20 pts",
                type=DriverType.NEGATIVE,
            ))

        if input_data.decision_maker_involved:
            score += 20
            drivers.append(ScoreDriver(
                factor="Direction Générale / DSI activement impliquée dans les échanges",
                impact="+20 pts",
                type=DriverType.POSITIVE,
            ))

        score = max(10, min(95, score))

        if score >= 70:
            tier = ScoringTier.TIER_1_PRIORITY
            prob = ConversionProbability.HIGH
            next_action = "Planifier une présentation exécutive de devis sous 48h."
        elif score >= 40:
            tier = ScoringTier.TIER_2_MEDIUM
            prob = ConversionProbability.MEDIUM
            next_action = "Réaliser l'audit d'éligibilité technique et consolider le dossier budgétaire."
        else:
            tier = ScoringTier.TIER_3_NURTURING
            prob = ConversionProbability.LOW
            next_action = "Intégrer dans la séquence d'informations périodiques et repositionner à Q+1."

        return LeadScoringOutput(
            lead_score=score,
            scoring_tier=tier,
            conversion_probability=prob,
            score_drivers=drivers or [
                ScoreDriver(factor="Volume d'activité et implantation analysés", impact="+10 pts", type=DriverType.POSITIVE)
            ],
            recommended_sales_angle="Valoriser le débit symétrique garanti et le support Orange Business B2B.",
            next_immediate_action=next_action,
        )
