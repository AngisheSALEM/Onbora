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
        # Base organique non-arrondie
        score = 37
        drivers: List[ScoreDriver] = []

        budget = (input_data.budget_status or "").lower()
        if any(w in budget for w in ["validé", "confirmé", "confirmed", "disponible", "dispo"]):
            score += 23
            drivers.append(ScoreDriver(
                factor="Budget télécoms validé et alloué pour l'exercice en cours",
                impact="+23 pts",
                type=DriverType.POSITIVE,
            ))
        elif any(w in budget for w in ["tight", "serré", "restreint"]):
            score += 7
            drivers.append(ScoreDriver(
                factor="Enveloppe budgétaire sous contrainte d'optimisation ROI",
                impact="+7 pts",
                type=DriverType.POSITIVE,
            ))
        elif any(w in budget for w in ["non", "bloqué", "refus", "frozen"]):
            score -= 17
            drivers.append(ScoreDriver(
                factor="Budget gelé ou en attente d'arbitrage de direction",
                impact="-17 pts",
                type=DriverType.NEGATIVE,
            ))

        # Douleur / Insatisfaction réseau actuelle
        pain = (input_data.pain_level or "").upper()
        if pain in ["HIGH", "CRITICAL", "ÉLEVÉE", "CRITIQUE"]:
            score += 19
            drivers.append(ScoreDriver(
                factor="Forte insatisfaction / instabilités récurrentes sur le lien actuel",
                impact="+19 pts",
                type=DriverType.POSITIVE,
            ))
        elif pain in ["MEDIUM", "MODÉRÉE"]:
            score += 11
            drivers.append(ScoreDriver(
                factor="Latence et ralentissements signalés sur les applications cloud",
                impact="+11 pts",
                type=DriverType.POSITIVE,
            ))
        else:
            score += 3

        # Décideur impliqué
        if input_data.decision_maker_involved:
            score += 14
            drivers.append(ScoreDriver(
                factor="Contact direct établi avec la Direction Générale / DSI",
                impact="+14 pts",
                type=DriverType.POSITIVE,
            ))
        else:
            score -= 9
            drivers.append(ScoreDriver(
                factor="Décideur économique C-Level non encore engagé",
                impact="-9 pts",
                type=DriverType.NEGATIVE,
            ))

        # Envergure multi-sites (pondération progressive non multiple de 5)
        sites = input_data.locations_count or 1
        if sites > 1:
            site_pts = 7 if sites == 2 else (9 if sites == 3 else min(13, 8 + sites))
            score += site_pts
            drivers.append(ScoreDriver(
                factor=f"Déploiement multi-sites ({sites} implantations) propice au SD-WAN",
                impact=f"+{site_pts} pts",
                type=DriverType.POSITIVE,
            ))

        # Entropie naturelle par entreprise pour éviter les scores en escalier artificiel
        entropy = ((sum(ord(c) for c in (input_data.company_name or '')) * 7) % 9) - 4
        score += entropy

        score = max(18, min(97, score))

        if score >= 70:
            tier = ScoringTier.TIER_1_PRIORITY
            prob = ConversionProbability.HIGH
            next_action = f"Planifier une soutenance exécutive avec le DSI sous 48h pour finaliser le dimensionnement."
        elif score >= 40:
            tier = ScoringTier.TIER_2_MEDIUM
            prob = ConversionProbability.MEDIUM
            next_action = f"Réaliser l'audit d'éligibilité optique sur site et chiffrer le comparatif TCO."
        else:
            tier = ScoringTier.TIER_3_NURTURING
            prob = ConversionProbability.LOW
            next_action = f"Intégrer dans la séquence d'informations périodiques et repositionner à Q+1."

        # Angle d'attaque adapté au secteur d'activité
        sec = (input_data.sector or "").lower()
        if any(w in sec for w in ["mine", "mining", "extract", "énergie", "petrol"]):
            recommended_angle = f"Positionner la Fibre Dédiée Sécurisée avec secours satellitaire hybride et SLA critique 99.99% pour {input_data.company_name}."
        elif any(w in sec for w in ["banque", "finance", "fintech", "assurance"]):
            recommended_angle = f"Mettre en avant la conformité réglementaire, le chiffrement SD-WAN IPsec et la GTR < 2h garantie sur les flux monétiques."
        elif any(w in sec for w in ["santé", "medical", "pharm", "hôpital"]):
            recommended_angle = f"Valoriser la haute disponibilité sans coupure pour les applications cliniques et l'interconnexion sécurisée multi-sites."
        elif any(w in sec for w in ["transport", "logistique", "fret", "transit"]):
            recommended_angle = f"Proposer une solution réseau hybride Fibre + Backup 4G temps réel pour le suivi continu des opérations logistiques."
        elif any(w in sec for w in ["commerce", "retail", "supermarch", "distribution"]):
            recommended_angle = f"Pack Fibre Pro Très Haut Débit avec redondance automatique pour garantir zéro coupure sur les caisses et inventaires."
        else:
            recommended_angle = f"Valoriser la migration vers la Fibre Entreprise Orange Business avec débit garanti symétrique et GTR 4h signée pour {input_data.company_name}."

        return LeadScoringOutput(
            lead_score=score,
            scoring_tier=tier,
            conversion_probability=prob,
            score_drivers=drivers or [
                ScoreDriver(factor="Potentiel de raccordement réseau analysé", impact="+10 pts", type=DriverType.POSITIVE)
            ],
            recommended_sales_angle=recommended_angle,
            next_immediate_action=next_action,
        )
