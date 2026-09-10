from __future__ import annotations

import datetime
from typing import List
from .models import PostCallInput

POST_CALL_SYSTEM_PROMPT = """Tu es le moteur Post-Call Execution d'Onbora, specialise dans la formalisation immediate des comptes-rendus de visite B2B pour les KAM et commerciaux d'Orange Business.

TON ROLE :
A partir d'une transcription vocale ou de notes d'un entretien commercial, tu generes en JSON strict :
1. Une synthese executive claire (2-3 phrases)
2. La liste des besoins confirmes et des objections soulevees
3. Un email de suivi professionnel personnalise pret a l'envoi
4. Un payload CRM normalise pour Microsoft Dynamics 365 / Salesforce
5. Les taches d'actions immediates (sous 48h)

REGLES ABSOLUES :
1. Reponds UNIQUEMENT en JSON valide, sans texte avant ni apres, sans markdown.
2. N'invente JAMAIS un produit Orange non mentionne dans le catalogue fourni.
3. L'email doit etre en francais professionnel B2B, chaleureux mais direct.

FORMAT DE SORTIE (strictement conforme) :
{
  "executive_summary": "<synthese claire et concise des enjeux discutes>",
  "confirmed_needs": ["<besoin 1>", "<besoin 2>"],
  "objections_raised": ["<objection 1>"],
  "client_followup_email": {
    "subject": "<objet precis, ex: Suite a notre echange — [sujet specifique]>",
    "body": "<corps complet du mail avec retours a la ligne \\n>"
  },
  "crm_payload": {
    "deal_stage": "<QUALIFIED_OPPORTUNITY|PROPOSAL_SENT|NEGOTIATION>",
    "probability": 75,
    "estimated_mrr_usd": 250.0,
    "identified_products": ["<offre 1>", "<offre 2>"],
    "next_step": "<action commerciale precise>",
    "next_followup_date": "<YYYY-MM-DD>",
    "key_contacts": [{"name": "<nom>", "role": "<fonction>", "influence": "DECISION_MAKER"}]
  },
  "action_tasks": [
    {"task": "<description>", "deadline": "<YYYY-MM-DD>", "priority": "HIGH", "is_urgent_48h": true, "status": "TODO"}
  ]
}"""


def build_post_call_user_prompt(input_data: PostCallInput, catalog_offers: List[str]) -> str:
    today = datetime.date.today()
    catalog_str = "\n".join(f"  - {offer}" for offer in catalog_offers) if catalog_offers else "  - (Offres standard Orange Business B2B)"

    return f"""Genere l'execution post-visite complete pour ce compte-rendu :

COMMERCIAL / KAM : {input_data.kam_name} (Orange Business)
CLIENT : {input_data.client_name} ({input_data.client_role})
ENTREPRISE : {input_data.company_name}
DATE DU JOUR : {today.isoformat()}

TRANSCRIPTION DE L'ECHANGE :
---
{input_data.meeting_transcript}
---

OFFRES ORANGE BUSINESS DISPONIBLES :
{catalog_str}

Genere l'ensemble des livrables en JSON strict."""
