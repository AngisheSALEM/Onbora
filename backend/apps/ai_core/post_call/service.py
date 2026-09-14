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


from shared.infrastructure.ai_providers import is_insufficient_verbatim


class PostCallExecutionEngine(BaseAIEngine):
    """
    Moteur 2 : Post-Call Execution Engine.
    Structure les comptes-rendus, prepare le mail de relance et le payload CRM.
    Zéro hallucination / Zéro mock sur verbatim insuffisant.
    """

    def generate(self, input_data: PostCallInput) -> PostCallOutput:
        if is_insufficient_verbatim(input_data.meeting_transcript):
            return self._build_insufficient_output(input_data)

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

    def _build_insufficient_output(self, input_data: PostCallInput) -> PostCallOutput:
        today = datetime.date.today()
        d_j1 = (today + datetime.timedelta(days=1)).isoformat()
        d_j2 = (today + datetime.timedelta(days=2)).isoformat()
        client = input_data.client_name
        company = input_data.company_name
        kam = input_data.kam_name

        return PostCallOutput(
            executive_summary=(
                f"Données insuffisantes pour formaliser un compte-rendu pour {company}. "
                "L'enregistrement ne contient pas d'échange commercial exploitable pour qualifier les besoins ou objections."
            ),
            confirmed_needs=[],
            objections_raised=[],
            client_followup_email=ClientFollowupEmail(
                subject=f"Prise de contact — {company} / Orange Business",
                body=(
                    f"Bonjour {client},\n\n"
                    f"Suite à notre brève prise de contact au sujet de {company}, je me permets de revenir vers vous afin "
                    "d'organiser un échange de 20 minutes pour faire le point sur vos enjeux d'infrastructure et de connectivité.\n\n"
                    f"Quelles seraient vos disponibilités dans les prochains jours ?\n\n"
                    f"Bien cordialement,\n{kam}\nOrange Business B2B"
                )
            ),
            crm_payload=CRMPayload(
                deal_stage="LEAD",
                probability=10,
                estimated_mrr_usd=0.0,
                identified_products=[],
                next_step=f"Recontacter {client} pour planifier un entretien approfondi",
                next_followup_date=d_j2,
                key_contacts=[
                    KeyContact(name=client, role=input_data.client_role, influence="DECISION_MAKER")
                ]
            ),
            action_tasks=[
                ActionTask(
                    id="task-1",
                    task=f"Recontacter {client} pour planifier un entretien approfondi de qualification",
                    deadline=d_j1,
                    priority="MEDIUM",
                    is_urgent_48h=False,
                    status="TODO"
                )
            ]
        )

    def _build_fallback(self, input_data: PostCallInput) -> PostCallOutput:
        today = datetime.date.today()
        d_j1 = (today + datetime.timedelta(days=1)).isoformat()
        d_j2 = (today + datetime.timedelta(days=2)).isoformat()
        client = input_data.client_name
        company = input_data.company_name
        kam = input_data.kam_name

        if is_insufficient_verbatim(input_data.meeting_transcript):
            return self._build_insufficient_output(input_data)

        text_lower = input_data.meeting_transcript.lower()
        needs = []
        if any(w in text_lower for w in ['fibre', 'connexion', 'haut débit', 'internet', 'bande']):
            needs.append("Connectivité Très Haut Débit sécurisée")
        if any(w in text_lower for w in ['panne', 'coupure', 'secours', 'backup', 'sla', 'latence']):
            needs.append("Garantie de continuité de service (SLA / Secours)")
        if any(w in text_lower for w in ['sécur', 'cyber', 'antivirus', 'firewall']):
            needs.append("Protection et cybersécurité des flux")
        if any(w in text_lower for w in ['cloud', 'serveur', 'm365', 'mail', 'héberg']):
            needs.append("Outils collaboratifs et Cloud d'entreprise")

        objections = []
        if any(w in text_lower for w in ['budget', 'prix', 'coût', 'cher', 'tarif']):
            objections.append("Sensibilité budgétaire")
        if any(w in text_lower for w in ['délai', 'déploiement', 'temps', 'installation']):
            objections.append("Contraintes de délai de mise en œuvre")
        if any(w in text_lower for w in ['contrat', 'engagement', 'opérateur']):
            objections.append("Contrat en cours chez un autre opérateur")

        return PostCallOutput(
            executive_summary=(
                f"Entretien réalisé avec {client} ({input_data.client_role}) chez {company}. "
                f"{'Besoins identifiés : ' + ', '.join(needs) + '.' if needs else 'Échange commercial de cadrage initial.'}"
            ),
            confirmed_needs=needs,
            objections_raised=objections,
            client_followup_email=ClientFollowupEmail(
                subject=f"Suite à notre échange — {company} / Orange Business",
                body=(
                    f"Bonjour {client},\n\n"
                    f"Je vous remercie pour le temps consacré lors de notre échange d'aujourd'hui concernant {company}.\n\n"
                    f"Nous étudions vos enjeux pour vous proposer une préconisation sur mesure.\n\n"
                    f"Bien cordialement,\n{kam}\nOrange Business B2B"
                )
            ),
            crm_payload=CRMPayload(
                deal_stage="QUALIFIED_OPPORTUNITY" if needs else "LEAD",
                probability=40 if needs else 15,
                estimated_mrr_usd=0.0,
                identified_products=[],
                next_step=f"Envoyer la synthèse d'échange à {client}",
                next_followup_date=d_j2,
                key_contacts=[
                    KeyContact(name=client, role=input_data.client_role, influence="DECISION_MAKER")
                ]
            ),
            action_tasks=[
                ActionTask(
                    id="task-1",
                    task=f"Transmettre l'e-mail de suivi formalisé à {client}",
                    deadline=d_j1,
                    priority="HIGH" if needs else "MEDIUM",
                    is_urgent_48h=True if needs else False,
                    status="TODO"
                )
            ]
        )
