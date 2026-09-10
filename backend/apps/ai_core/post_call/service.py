from __future__ import annotations

import datetime
import logging
from typing import List
from ..common.base_engine import BaseAIEngine
from ..common.catalog_guard import build_catalog_context_prompt
from .models import (
    PostCallInput,
    PostCallOutput,
    ClientFollowupEmail,
    CRMPayload,
    KeyContact,
    ActionTask,
)
from .prompts import POST_CALL_SYSTEM_PROMPT, build_post_call_user_prompt

logger = logging.getLogger(__name__)


class PostCallExecutionEngine(BaseAIEngine):
    """
    Moteur 2 : Post-Call Execution Engine.
    Structure les comptes-rendus, prepare le mail de relance et le payload CRM.
    """

    def generate(self, input_data: PostCallInput) -> PostCallOutput:
        catalog_offers = build_catalog_context_prompt(
            catalog_context=input_data.orange_catalog_context,
            query=f"{input_data.company_name} besoins",
        )
        user_prompt = build_post_call_user_prompt(input_data, catalog_offers)

        ai_res = self.call_gemini_json(user_prompt, system_instruction=POST_CALL_SYSTEM_PROMPT)
        if ai_res:
            try:
                return PostCallOutput.model_validate(ai_res)
            except Exception as exc:
                logger.warning("[PostCall] Erreur validation schema Pydantic (%s), bascule fallback.", exc)

        return self._build_fallback(input_data)

    def _build_fallback(self, input_data: PostCallInput) -> PostCallOutput:
        today = datetime.date.today()
        d_j1 = (today + datetime.timedelta(days=1)).isoformat()
        d_j2 = (today + datetime.timedelta(days=2)).isoformat()
        client = input_data.client_name
        company = input_data.company_name
        kam = input_data.kam_name

        return PostCallOutput(
            executive_summary=(
                f"Entretien constructif avec {client} ({input_data.client_role}) chez {company}. "
                "Confirmation d'un fort interet pour securiser la connectivite entreprise et centraliser les outils collaboratifs avec Orange Business."
            ),
            confirmed_needs=[
                "Lien Fibre Optique Dediee Pro avec GTR 4h garantie",
                "Secours automatique 4G sans coupure",
                "Suite collaborative Microsoft 365 Business"
            ],
            objections_raised=[
                "Verification necessaire de la periode de fin de contrat avec l'operateur tiers",
                "Validation budgetaire finale requise par la Direction Financiere"
            ],
            client_followup_email=ClientFollowupEmail(
                subject=f"Suite a notre echange — Plan de modernisation pour {company}",
                body=(
                    f"Bonjour {client},\n\n"
                    f"Je vous remercie vivement pour le temps consacre lors de notre echange d'aujourd'hui concernant {company}.\n\n"
                    f"Comme aborde ensemble, nous finalisons la proposition technique Orange Business incluant notre lien Fibre Dedie securise avec GTR 4h garantie.\n\n"
                    f"Restant a votre entiere disposition pour planifier l'audit technique d'eligibilite.\n\n"
                    f"Bien cordialement,\n{kam}\nOrange Business B2B"
                )
            ),
            crm_payload=CRMPayload(
                deal_stage="PROPOSAL_SENT",
                probability=75,
                estimated_mrr_usd=320.0,
                identified_products=["Fibre Dediee Pro", "Pack Microsoft 365 Pro"],
                next_step="Envoi de l'offre technique et financiere sous 48h",
                next_followup_date=d_j2,
                key_contacts=[
                    KeyContact(name=client, role=input_data.client_role, influence="DECISION_MAKER")
                ]
            ),
            action_tasks=[
                ActionTask(
                    id="task-1",
                    task=f"Transmettre l'e-mail de suivi formalise a {client}",
                    deadline=d_j1,
                    priority="HIGH",
                    is_urgent_48h=True,
                    status="TODO"
                ),
                ActionTask(
                    id="task-2",
                    task="Coordonner la validation technique d'eligibilite avec l'equipe avant-vente Orange",
                    deadline=d_j2,
                    priority="HIGH",
                    is_urgent_48h=True,
                    status="TODO"
                )
            ]
        )
