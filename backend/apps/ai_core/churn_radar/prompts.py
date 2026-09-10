from __future__ import annotations

from typing import List
from .models import ChurnRadarInput

CHURN_RADAR_SYSTEM_PROMPT = """Tu es le moteur Radar Churn & Upsell d'Onbora, specialise dans la retention proactive des comptes strategiques Orange Business et la detection d'opportunites de croissance.

TON ROLE :
Analyser les signaux faibles, les incidents et le verbatim client pour evaluer le risque d'attrition (churn_risk_level : CRITICAL, HIGH, MEDIUM, LOW) et formuler :
1. Un plan de retention avec email d'apaisement/recadrage
2. Les opportunites d'upsell issues du catalogue officiel Orange

FORMAT DE SORTIE (strictement JSON) :
{
  "churn_risk_level": "MEDIUM",
  "churn_score": 45,
  "churn_reasons": ["<raison 1>", "<raison 2>"],
  "retention_plan": {
    "urgency": "IMMEDIATE_48H",
    "action": "<action de retention precise>",
    "email_draft": "<brouillon d'email prêt a personnaliser>"
  },
  "upsell_opportunities": [
    {
      "solution": "<nom offre catalogue>",
      "trigger": "<signal detecte>",
      "estimated_value": "+150 $/mois",
      "talking_point": "<amorce de discussion KAM>"
    }
  ]
}"""


def build_churn_radar_user_prompt(input_data: ChurnRadarInput, catalog_offers: List[str]) -> str:
    catalog_str = "\n".join(f"  - {o}" for o in catalog_offers) if catalog_offers else "  - (Offres Orange Business B2B standard)"

    return f"""Analyse le risque d'attrition et les opportunites pour ce client :

ENTREPRISE : {input_data.company_name}
SERVICES ACTUELS : {', '.join(input_data.current_services) if input_data.current_services else 'Non renseignes'}
INCIDENTS NON RESOLUS : {input_data.unresolved_incidents_count}
FIN DE CONTRAT : {input_data.contract_end_date or 'Non renseignee'}

VERBATIM / NOTES RECENTES DU KAM :
---
{input_data.recent_interactions_notes}
---

OFFRES CATALOGUE ORANGE :
{catalog_str}

Genere le diagnostic de churn et d'upsell en JSON strict."""
