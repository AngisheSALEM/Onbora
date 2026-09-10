from __future__ import annotations

import logging
from typing import List
from ..common.base_engine import BaseAIEngine
from ..common.catalog_guard import build_catalog_context_prompt
from .models import (
    ChurnRadarInput,
    ChurnRadarOutput,
    ChurnRiskLevel,
    RetentionActionPlan,
    UpsellOpportunity,
)
from .prompts import CHURN_RADAR_SYSTEM_PROMPT, build_churn_radar_user_prompt

logger = logging.getLogger(__name__)


class ChurnRadarEngine(BaseAIEngine):
    """
    Moteur 4 : Radar Churn & Upsell Engine.
    Detecte les risques d'attrition et formule des plans de retention et d'upsell.
    """

    def analyze(self, input_data: ChurnRadarInput) -> ChurnRadarOutput:
        catalog_offers = build_catalog_context_prompt(
            catalog_context=input_data.orange_catalog_context,
            query=f"{input_data.company_name} rétention upsell",
        )
        user_prompt = build_churn_radar_user_prompt(input_data, catalog_offers)

        ai_res = self.call_gemini_json(user_prompt, system_instruction=CHURN_RADAR_SYSTEM_PROMPT)
        if ai_res:
            try:
                return ChurnRadarOutput.model_validate(ai_res)
            except Exception as exc:
                logger.warning("[ChurnRadar] Erreur validation schema Pydantic (%s), bascule fallback.", exc)

        return self._build_fallback(input_data)

    def _build_fallback(self, input_data: ChurnRadarInput) -> ChurnRadarOutput:
        incidents = input_data.unresolved_incidents_count or 0
        company = input_data.company_name

        if incidents >= 2:
            level = ChurnRiskLevel.HIGH
            score = 75
            urgency = "IMMEDIATE_24H"
            action = f"Déclencher une réunion de crise REX avec le DSI de {company} et le responsable support technique."
        elif incidents == 1:
            level = ChurnRiskLevel.MEDIUM
            score = 45
            urgency = "IMMEDIATE_48H"
            action = f"Faire un point de satisfaction de mi-parcours avec la direction de {company}."
        else:
            level = ChurnRiskLevel.LOW
            score = 20
            urgency = "PLANNED_7D"
            action = f"Proposer un bilan semestriel des consommations et anticiper les besoins d'évolution."

        return ChurnRadarOutput(
            churn_risk_level=level,
            churn_score=score,
            churn_reasons=[
                f"{incidents} incident(s) non résolu(s) signalés sur le périmètre",
                "Sensibilité forte à la réactivité du support client",
            ] if incidents > 0 else ["Relation saine, vigilance sur les dates de renouvellement."],
            retention_plan=RetentionActionPlan(
                urgency=urgency,
                action=action,
                email_draft=(
                    f"Bonjour,\n\n"
                    f"Je reviens vers vous suite aux récents points techniques concernant vos accès {company}.\n\n"
                    f"La qualité de votre expérience est notre priorité absolue. Je souhaite convenir d'un échange direct de 15 minutes afin de faire un point complet et valider les actions de pérennisation mises en place.\n\n"
                    f"Bien cordialement,\nVotre Responsable de Compte Orange Business B2B"
                ),
            ),
            upsell_opportunities=[
                UpsellOpportunity(
                    solution="SD-WAN Managé & Double Adduction Fibre",
                    trigger="Besoin de sécuriser les flux et d'éliminer toute dépendance à un lien unique",
                    estimated_value="+220 $/mois",
                    talking_point="Proposer une double liaison active avec bascule transparente pour garantir zéro coupure.",
                )
            ]
        )
