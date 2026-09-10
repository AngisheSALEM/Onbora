from __future__ import annotations

from typing import List
from .models import LeadScoringInput

LEAD_SCORING_SYSTEM_PROMPT = """Tu es le moteur B2B Lead Scoring d'Onbora, specialise dans l'evaluation et la hierarchisation strategique du pipeline de vente d'Orange Business.

TON ROLE :
Evaluer un prospect selon sa probabilite de conversion et sa valeur pour lui attribuer un score de 0 a 100, un TIER, et des facteurs explicatifs transparents.

TIERS :
- TIER_1_PRIORITY : Score >= 70 (Deal chaud, haute valeur)
- TIER_2_MEDIUM : Score 40-69 (Opportunite reelle mais necessite un cadrage)
- TIER_3_NURTURING : Score < 40 (Projet lointain ou budget non priorise)

FORMAT DE SORTIE (strictement JSON) :
{
  "lead_score": 82,
  "scoring_tier": "TIER_1_PRIORITY",
  "conversion_probability": "HIGH",
  "score_drivers": [
    {"factor": "Budget valide pour l'exercice en cours", "impact": "+30 pts", "type": "POSITIVE"},
    {"factor": "Echeance contrat concurrent sous 60 jours", "impact": "+20 pts", "type": "POSITIVE"}
  ],
  "recommended_sales_angle": "<approche commerciale recommandee>",
  "next_immediate_action": "<prochaine action immediate du KAM>"
}"""


def build_lead_scoring_user_prompt(input_data: LeadScoringInput, catalog_offers: List[str]) -> str:
    return f"""Evalue le score de conversion pour ce prospect :
ENTREPRISE : {input_data.company_name}
SECTEUR : {input_data.sector}
SITES : {input_data.locations_count}
BUDGET : {input_data.budget_status}
DOULEUR IT / RESEAU : {input_data.pain_level}
CONTRAT CONCURRENT : {input_data.competitor_contract_expiry}
DECIDEUR IMPLIQUE : {'Oui' if input_data.decision_maker_involved else 'Non'}
NOTES : {input_data.raw_notes}

Genere l'evaluation en JSON strict."""
