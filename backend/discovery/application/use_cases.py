from typing import List, Dict, Any, Optional
import sys
from discovery.models import ClientConversation, ClientConversationMessage
from discovery.domain.exceptions import ConversationNotFoundException, EmptyMessageException
from discovery.application.dtos import (
    ClientConversationDTO,
    ConversationMessageDTO,
    SendMessageResponseDTO,
    TransmitConversationDTO,
)
from discovery.ai_engine import (
    parse_message_for_profile,
    generate_next_step,
    generate_recommendations_and_twin,
)
from discovery.core_ai_client import is_core_ai_available, call_core_ai_turn
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from reporting.utils import log_demo_event
from shared.application.use_case import BaseUseCase


class CreateConversationUseCase(BaseUseCase[tuple[Optional[Any], str], ClientConversation]):
    def execute(self, params: tuple[Optional[Any], str]) -> ClientConversation:
        user, channel = params
        client = user if (user and user.is_authenticated) else None

        conversation = ClientConversation.objects.create(
            client=client,
            channel=channel or ClientConversation.PORTAL,
            status=ClientConversation.ACTIVE
        )

        greeting_text = (
            "Bonjour ! Je suis Onbora, votre copilote pour concevoir les solutions de services managés (MSP) "
            "adaptées à votre entreprise. Pour commencer, pouvez-vous me décrire l'activité de votre entreprise ?"
        )
        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.AI,
            content=greeting_text
        )

        company = user.company_name if (user and user.is_authenticated and user.company_name) else 'Anonyme'
        log_demo_event(
            'CONVERSATION_STARTED',
            f"Début de conversation inbound pour l'entreprise: {company}",
            user=user if (user and user.is_authenticated) else None,
            metadata={"conversation_id": conversation.id}
        )

        return conversation


class SendMessageUseCase(BaseUseCase[tuple[int, str, Any, Any], SendMessageResponseDTO]):
    def execute(self, params: tuple[int, str, Any, Any]) -> SendMessageResponseDTO:
        conversation_id, content, user, request = params
        content = content.strip()
        if not content:
            raise EmptyMessageException()

        try:
            conversation = ClientConversation.objects.get(pk=conversation_id)
        except ClientConversation.DoesNotExist:
            raise ConversationNotFoundException(conversation_id)

        # 1. Save user message
        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.USER,
            content=content
        )

        # 2. Check if we are currently collecting administrative/contract info
        current_profile = conversation.extracted_profile or {}
        awaiting_field = current_profile.get("awaiting_field")

        dossier = None
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
        except ProspectDossier.DoesNotExist:
            pass

        user_msg_lower = content.lower()
        wants_kam = any(kw in user_msg_lower for kw in ["kam", "transmettre", "envoyer", "dossier", "conseiller", "valider", "contrat", "commande", "souscrire"])

        is_already_qualified = False
        if dossier:
            is_already_qualified = hasattr(dossier, 'businesstwin')

        message_count = conversation.messages.filter(sender=ClientConversationMessage.USER).count()
        is_qualified = is_already_qualified or (message_count >= 3)

        # If currently in the awaiting info loop
        if awaiting_field:
            if not dossier:
                dossier = ProspectDossier.objects.create(
                    conversation=conversation,
                    source=ProspectDossier.INBOUND_CONVERSATION,
                    status=ProspectDossier.NEW,
                    raw_conversation_data={"profile": current_profile}
                )

            if awaiting_field == "contact_name":
                dossier.contact_name = content
                dossier.save()
                current_profile["awaiting_field"] = "phone"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Merci. Quel est votre **numéro de téléphone direct** ?"
            elif awaiting_field == "phone":
                dossier.phone = content
                dossier.save()
                current_profile["awaiting_field"] = "rccm"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Parfait. Quel est le **numéro RCCM** (Registre du Commerce et du Crédit Mobilier) de votre entreprise ?"
            elif awaiting_field == "rccm":
                dossier.rccm = content
                dossier.save()
                current_profile["awaiting_field"] = "billing_address"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Entendu. Quelle est l'**adresse complète de facturation** de votre entreprise ?"
            elif awaiting_field == "billing_address":
                dossier.billing_address = content
                dossier.save()
                current_profile["awaiting_field"] = "crm"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Quel logiciel **CRM** (ex: Salesforce, HubSpot, Zoho, ou aucun) utilisez-vous au sein de votre entreprise B2B ?"
            elif awaiting_field == "crm":
                if not dossier.raw_conversation_data:
                    dossier.raw_conversation_data = {}
                dossier.raw_conversation_data["crm"] = content
                dossier.is_complete = True
                dossier.save()

                current_profile.pop("awaiting_field", None)
                current_profile["crm"] = content
                conversation.extracted_profile = current_profile
                conversation.status = ClientConversation.TRANSMITTED
                conversation.save()

                from kam.dispatch_engine import dispatch_dossier
                best_kam = dispatch_dossier(dossier)

                kam_name = f"{best_kam.first_name} {best_kam.last_name}" if best_kam else "un conseiller"
                kam_location = f"({best_kam.location})" if (best_kam and best_kam.location) else ""

                next_question = (
                    f"Super, j'ai bien noté que vous utilisez le CRM : **{content}**.\n\n"
                    f"✓ **Félicitations !** Votre dossier est maintenant complet et a été automatiquement transmis à notre KAM : "
                    f"**{kam_name}** {kam_location}.\n\n"
                    f"Il/Elle prendra contact avec vous rapidement au **{dossier.phone}**.\n\n"
                    f"Vous pouvez également suivre l'avancement de votre commande dans votre **Espace Profil**."
                )

            ai_msg_obj = ClientConversationMessage.objects.create(
                conversation=conversation,
                sender=ClientConversationMessage.AI,
                content=next_question
            )

            recommendations = []
            business_twin_data = None
            try:
                twin = BusinessTwin.objects.get(prospect_dossier=dossier)
                recommendations = twin.recommended_services
                business_twin_data = {
                    "current_state": twin.current_state,
                    "proposed_state": twin.proposed_state,
                    "roadmap": twin.roadmap
                }
            except Exception:
                pass

            return SendMessageResponseDTO(
                ai_message=next_question,
                extracted_profile=current_profile,
                is_qualified=True,
                recommendations=recommendations,
                business_twin=business_twin_data,
                message_id=ai_msg_obj.id,
            )

        # If not in awaiting info loop, but user wants to transmit to KAM
        elif is_qualified and wants_kam:
            if not dossier:
                dossier = ProspectDossier.objects.create(
                    conversation=conversation,
                    source=ProspectDossier.INBOUND_CONVERSATION,
                    status=ProspectDossier.NEW,
                    raw_conversation_data={"profile": current_profile}
                )

            has_crm = dossier.raw_conversation_data and dossier.raw_conversation_data.get("crm")
            if dossier.contact_name and dossier.phone and dossier.rccm and dossier.billing_address and has_crm:
                conversation.status = ClientConversation.TRANSMITTED
                conversation.save()

                from kam.dispatch_engine import dispatch_dossier
                best_kam = dispatch_dossier(dossier)

                kam_name = f"{best_kam.first_name} {best_kam.last_name}" if best_kam else "un conseiller"
                kam_location = f"({best_kam.location})" if (best_kam and best_kam.location) else ""

                next_question = (
                    f"✓ **Votre dossier est déjà complet !** Il a été automatiquement transmis à notre KAM : "
                    f"**{kam_name}** {kam_location}.\n\n"
                    f"Il/Elle prendra contact avec vous prochainement sur votre numéro **{dossier.phone}**.\n\n"
                    f"Vous pouvez également suivre l'avancement de votre commande dans votre **Espace Profil**."
                )
            else:
                if not dossier.contact_name:
                    current_profile["awaiting_field"] = "contact_name"
                    conversation.extracted_profile = current_profile
                    conversation.save()
                    next_question = (
                        "Avec plaisir ! Pour finaliser et transmettre votre dossier à un Key Account Manager (KAM), "
                        "j'ai besoin de quelques informations de contact et de facturation.\n\n"
                        "Tout d'abord, quel est le **nom complet** du signataire du contrat ?"
                    )
                elif not dossier.phone:
                    current_profile["awaiting_field"] = "phone"
                    conversation.extracted_profile = current_profile
                    conversation.save()
                    next_question = "Entendu. Quel est votre **numéro de téléphone direct** pour que le KAM puisse vous joindre ?"
                elif not dossier.rccm:
                    current_profile["awaiting_field"] = "rccm"
                    conversation.extracted_profile = current_profile
                    conversation.save()
                    next_question = "Merci. Quel est le **numéro RCCM** (Registre du Commerce) de votre entreprise ?"
                elif not dossier.billing_address:
                    current_profile["awaiting_field"] = "billing_address"
                    conversation.extracted_profile = current_profile
                    conversation.save()
                    next_question = "C'est noté. Quelle est l'**adresse complète de facturation** de votre entreprise ?"
                else:
                    current_profile["awaiting_field"] = "crm"
                    conversation.extracted_profile = current_profile
                    conversation.save()
                    next_question = "Parfait. Quel logiciel **CRM** (ex: Salesforce, HubSpot, Zoho, ou aucun) utilisez-vous dans votre entreprise B2B ?"

            ai_msg_obj = ClientConversationMessage.objects.create(
                conversation=conversation,
                sender=ClientConversationMessage.AI,
                content=next_question
            )

            recommendations = []
            business_twin_data = None
            try:
                twin = BusinessTwin.objects.get(prospect_dossier=dossier)
                recommendations = twin.recommended_services
                business_twin_data = {
                    "current_state": twin.current_state,
                    "proposed_state": twin.proposed_state,
                    "roadmap": twin.roadmap
                }
            except Exception:
                pass

            return SendMessageResponseDTO(
                ai_message=next_question,
                extracted_profile=current_profile,
                is_qualified=True,
                recommendations=recommendations,
                business_twin=business_twin_data,
                message_id=ai_msg_obj.id,
            )

        # 3. Standard Turn Handling: Priority to Core AI microservice!
        else:
            is_running_test = ('test' in sys.argv) or (request and request.headers.get('User-Agent') == 'testclient')
            if is_core_ai_available() and not is_running_test:
                ai_res = call_core_ai_turn(conversation.id, content)
                if ai_res and ("assistant_message" in ai_res or "next_question" in ai_res):
                    next_question = ai_res.get("assistant_message") or ai_res.get("next_question")
                    profile_patch = ai_res.get("profile_patch")
                    if profile_patch and isinstance(profile_patch, dict):
                        for k, v in profile_patch.items():
                            if v is not None:
                                current_profile[k] = v
                        conversation.extracted_profile = current_profile
                        conversation.save()

                    readiness = ai_res.get("readiness", {})
                    is_ready = readiness.get("is_ready", False) or (message_count >= 3) or is_qualified

                    recommendations = []
                    business_twin_data = None
                    if is_ready:
                        recommendations, business_twin_data = generate_recommendations_and_twin(current_profile, conversation)

                    ai_msg_obj = ClientConversationMessage.objects.create(
                        conversation=conversation,
                        sender=ClientConversationMessage.AI,
                        content=next_question
                    )

                    log_demo_event(
                        'MESSAGE_SENT',
                        f"Échange avec Core AI pour la conversation #{conversation.id}",
                        user=user if (user and user.is_authenticated) else None,
                        metadata={"conversation_id": conversation.id, "provider": "core_ai"}
                    )

                    return SendMessageResponseDTO(
                        message_id=ai_msg_obj.id,
                        ai_message=next_question,
                        extracted_profile=current_profile,
                        is_qualified=is_ready,
                        recommendations=recommendations,
                        business_twin=business_twin_data
                    )

            # Fallback to local heuristic engine
            updated_profile = parse_message_for_profile(content, current_profile)
            conversation.extracted_profile = updated_profile
            conversation.save()

            step_result = generate_next_step(updated_profile, message_count)
            next_question = step_result['next_question']
            is_qualified = step_result['is_qualified'] or is_qualified

            if is_qualified:
                try:
                    dossier = ProspectDossier.objects.get(conversation=conversation)
                except ProspectDossier.DoesNotExist:
                    dossier = None

                if dossier:
                    if dossier.status in [ProspectDossier.IN_REVIEW, ProspectDossier.ACCEPTED]:
                        next_question += (
                            "\n\n✓ Votre dossier a été transmis à nos équipes Orange Business avec succès. "
                            "Vous pouvez suivre la progression de l'acquisition de vos produits dans votre Espace Profil."
                        )
                    elif dossier.is_complete:
                        next_question += (
                            "\n\n📋 Vos informations contractuelles sont complètes ! "
                            "Vous pouvez maintenant soumettre votre commande au conseiller (KAM) depuis le volet de gauche ou votre Espace Profil."
                        )
                    else:
                        next_question += (
                            "\n\n⚠️ Des informations administratives obligatoires sont manquantes (Nom, Téléphone, RCCM, Facturation) pour signer un contrat Orange Business. "
                            "Veuillez compléter votre profil dans votre Espace Profil (bouton en haut de la page) afin de pouvoir transmettre votre demande d'achat."
                        )
                else:
                    next_question += (
                        "\n\n⚠️ Votre conversation est terminée ! Pour générer le contrat Orange Business, "
                        "veuillez renseigner vos coordonnées administratives (Nom, Téléphone, RCCM, Adresse de facturation) dans votre Espace Profil."
                    )

            ai_msg_obj = ClientConversationMessage.objects.create(
                conversation=conversation,
                sender=ClientConversationMessage.AI,
                content=next_question
            )

            recommendations = []
            business_twin_data = None
            if is_qualified:
                recommendations, business_twin_data = generate_recommendations_and_twin(updated_profile, conversation)

            log_demo_event(
                'MESSAGE_SENT',
                f"Échange de messages dans la conversation #{conversation.id}",
                user=user if (user and user.is_authenticated) else None,
                metadata={"conversation_id": conversation.id}
            )

            if is_qualified:
                log_demo_event(
                    'CONVERSATION_SUCCESS',
                    f"Conversation réussie pour l'entreprise #{conversation.id}",
                    user=user if (user and user.is_authenticated) else None,
                    metadata={"conversation_id": conversation.id}
                )

            return SendMessageResponseDTO(
                ai_message=next_question,
                extracted_profile=updated_profile,
                is_qualified=is_qualified,
                recommendations=recommendations,
                business_twin=business_twin_data,
                message_id=ai_msg_obj.id,
            )
