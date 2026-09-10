from __future__ import annotations

import logging
from typing import List, Optional
from ..common.base_engine import BaseAIEngine
from ..common.catalog_guard import build_catalog_context_prompt
from .models import PreCallInput, PreCallOutput, CompanyOverview, DecisionMaker, PitchAngle
from .prompts import PRE_CALL_SYSTEM_PROMPT, build_pre_call_user_prompt

logger = logging.getLogger(__name__)


class PreCallIntelligenceEngine(BaseAIEngine):
    """
    Moteur 1 : Pre-Call Intelligence Engine.
    Genere un dossier de preparation d'attaque complet pour le commercial ou le KAM.
    """

    def generate(self, input_data: PreCallInput) -> PreCallOutput:
        catalog_offers = build_catalog_context_prompt(
            catalog_context=input_data.orange_catalog_context,
            query=f"{input_data.company_name} {input_data.sector}",
        )
        user_prompt = build_pre_call_user_prompt(input_data, catalog_offers)

        ai_res = self.call_gemini_json(user_prompt, system_instruction=PRE_CALL_SYSTEM_PROMPT)
        if ai_res:
            try:
                return PreCallOutput.model_validate(ai_res)
            except Exception as exc:
                logger.warning("[PreCall] Erreur validation schema Pydantic (%s), bascule fallback.", exc)

        return self._build_fallback(input_data, catalog_offers)

    def _build_fallback(self, input_data: PreCallInput, catalog_offers: List[str]) -> PreCallOutput:
        sites = input_data.locations_count or 1
        primary = catalog_offers[0] if catalog_offers else "Fibre Securisee Dediee Pro (GTR 4h)"
        secondary = catalog_offers[1] if len(catalog_offers) > 1 else "CyberSOC & Firewall Manage 24/7"

        return PreCallOutput(
            company_overview=CompanyOverview(
                summary=f"Acteur cle du secteur {input_data.sector} avec {sites} implantation(s). Enjeu majeur de stabilite reseau et securite des flux.",
                estimated_employees="50-200 collaborateurs",
                digital_maturity="MEDIUM",
            ),
            key_decision_makers=[
                DecisionMaker(
                    role="DSI (Directeur des Systemes d'Information)",
                    profile_type="Technique & Resilience",
                    concerns="Garantir la continuite sans coupure et eliminer la latence sur les applications metier.",
                ),
                DecisionMaker(
                    role="Directeur Financier (DAF)",
                    profile_type="Rentabilite & ROI",
                    concerns="Optimiser les couts telecoms globaux et justifier les investissements d'infrastructure.",
                ),
            ],
            detected_business_challenges=[
                "Risque d'interruption d'activite en cas de coupure de l'acces principal",
                f"Complexite de l'interconnexion securisee entre les {sites} sites",
                "Protection des donnees clients et conformite reglementaire",
            ],
            custom_pitch_angles=[
                PitchAngle(
                    target_offer=primary,
                    why_relevant="Garantit zero coupure avec secours automatique et GTR 4h signee.",
                    hook_sentence="Quel est le cout direct pour vos operations lors d'une interruption de connexion de 2 heures ?",
                ),
                PitchAngle(
                    target_offer=secondary,
                    why_relevant="Centralise la cyberdefense et protege contre les ransomwares.",
                    hook_sentence="Comment vos sauvegardes et serveurs sont-ils proteges en cas d'attaque virale ?",
                ),
            ],
            critical_discovery_questions=[
                "Quelle est la criticite de votre connexion internet pour la facturation et les applications metier ?",
                "Disposez-vous d'une ligne de secours active qui bascule sans coupure ?",
                "Qui sont les signataires finaux pour la validation des contrats d'infrastructure ?",
            ],
            golden_rules=[
                "Ne jamais denigrer l'operateur en place : valoriser nos engagements de niveau de service SLA 99.99%.",
                "Faire verbaliser la douleur financiere avant d'evoquer tout chiffrage.",
            ]
        )
