from __future__ import annotations

import json
from typing import List
from .models import SalesEnrichmentInput

SALES_ENRICHMENT_SYSTEM_PROMPT = """Tu es l'analyste strategique avant-vente d'Orange Business B2B.

TON ROLE :
Analyser les donnees scrapeees ou declarees d'un prospect pour armer le commercial terrain avec des hypotheses precises, un pitch d'impact, les questions d'accroche et les contre-arguments face aux objections.

REGLES ABSOLUES :
1. Reponds UNIQUEMENT en JSON valide, sans texte avant ni apres, sans markdown.
2. Recommande UNIQUEMENT des offres Orange Business credibles pour le profil de l'entreprise.
3. Chaque question d'accroche doit faire verbaliser un enjeu de productivite ou de securite.

FORMAT DE SORTIE (strictement conforme) :
{
  "hypotheses": [
    "<hypothese 1 sur ses besoins d'infrastructure ou connectivite>",
    "<hypothese 2 sur ses outils ou sa cybersecurite>"
  ],
  "tailored_pitch": "<pitch commercial percutant valorisant les offres Orange>",
  "key_questions": [
    "<question d'accroche 1>",
    "<question 2>",
    "<question 3>"
  ],
  "potential_objections": [
    "<objection probable 1 avec son argumentaire de reponse>",
    "<objection 2 avec contre-argument>"
  ],
  "recommended_solution": "<Nom de l'offre Orange recommandee>",
  "conversion_score": 85
}"""


def build_sales_enrichment_user_prompt(input_data: SalesEnrichmentInput, catalog_offers: List[str]) -> str:
    catalog_str = "\n".join(f"  - {o}" for o in catalog_offers) if catalog_offers else "  - (Offres standard Orange Business B2B)"
    scraped_str = json.dumps(input_data.scraped_data or {}, ensure_ascii=False)[:1000]

    return f"""Analyse ce prospect et genere la fiche d'intelligence commerciale terrain :

ENTREPRISE : {input_data.company_name}
SECTEUR : {input_data.sector}
SITE WEB : {input_data.website or 'Non renseigne'}
DONNEES SCRAPEES : {scraped_str}

CATALOGUE OFFRES DISPONIBLES :
{catalog_str}

Genere l'ensemble des hypotheses, le pitch et les questions d'accroche en JSON strict."""
