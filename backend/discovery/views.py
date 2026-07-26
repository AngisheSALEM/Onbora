from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import ClientConversation, ClientConversationMessage
from .serializers import ClientConversationSerializer
from .ai_engine import parse_message_for_profile, generate_next_step, generate_recommendations_and_twin
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from reporting.utils import log_demo_event

class ConversationCreateView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response([])
        conversations = ClientConversation.objects.filter(client=request.user).order_by('-created_at')
        serializer = ClientConversationSerializer(conversations, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        channel = request.data.get('channel', ClientConversation.PORTAL)
        client = request.user if request.user.is_authenticated else None
        
        conversation = ClientConversation.objects.create(
            client=client,
            channel=channel,
            status=ClientConversation.ACTIVE
        )
        
        # Create default greeting message from AI
        greeting_text = (
            "Bonjour ! Je suis Onbora, votre copilote pour concevoir les solutions de services managés (MSP) "
            "adaptées à votre entreprise. Pour commencer, pouvez-vous me décrire l'activité de votre entreprise ?"
        )
        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.AI,
            content=greeting_text
        )
        
        log_demo_event(
            'CONVERSATION_STARTED',
            f"Début de qualification inbound pour l'entreprise: {request.user.company_name if (request.user.is_authenticated and request.user.company_name) else 'Anonyme'}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"conversation_id": conversation.id}
        )
        
        serializer = ClientConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageCreateView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        user_message_content = request.data.get('content', '').strip()
        if not user_message_content:
            return Response({"detail": "Le contenu du message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Save user message
        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.USER,
            content=user_message_content
        )
        
        # 2. Check if we are currently collecting administrative/contract info
        current_profile = conversation.extracted_profile or {}
        awaiting_field = current_profile.get("awaiting_field")
        
        dossier = None
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
        except ProspectDossier.DoesNotExist:
            pass
            
        # Check if the user is explicitly requesting to send their dossier to the KAM
        user_msg_lower = user_message_content.lower()
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
                    raw_qualification_data={"profile": current_profile}
                )
                
            if awaiting_field == "contact_name":
                dossier.contact_name = user_message_content
                dossier.save()
                current_profile["awaiting_field"] = "phone"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Merci. Quel est votre **numéro de téléphone direct** ?"
            elif awaiting_field == "phone":
                dossier.phone = user_message_content
                dossier.save()
                current_profile["awaiting_field"] = "rccm"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Parfait. Quel est le **numéro RCCM** (Registre du Commerce et du Crédit Mobilier) de votre entreprise ?"
            elif awaiting_field == "rccm":
                dossier.rccm = user_message_content
                dossier.save()
                current_profile["awaiting_field"] = "billing_address"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Entendu. Quelle est l'**adresse complète de facturation** de votre entreprise ?"
            elif awaiting_field == "billing_address":
                dossier.billing_address = user_message_content
                dossier.save()
                current_profile["awaiting_field"] = "crm"
                conversation.extracted_profile = current_profile
                conversation.save()
                next_question = "Quel logiciel **CRM** (ex: Salesforce, HubSpot, Zoho, ou aucun) utilisez-vous au sein de votre entreprise B2B ?"
            elif awaiting_field == "crm":
                if not dossier.raw_qualification_data:
                    dossier.raw_qualification_data = {}
                dossier.raw_qualification_data["crm"] = user_message_content
                dossier.is_complete = True
                dossier.save()
                
                # Clear awaiting field
                current_profile.pop("awaiting_field", None)
                current_profile["crm"] = user_message_content
                conversation.extracted_profile = current_profile
                conversation.status = ClientConversation.TRANSMITTED
                conversation.save()
                
                # Trigger automated dispatching
                from kam.dispatch_engine import dispatch_dossier
                best_kam = dispatch_dossier(dossier)
                
                kam_name = f"{best_kam.first_name} {best_kam.last_name}" if best_kam else "un conseiller"
                kam_location = f"({best_kam.location})" if (best_kam and best_kam.location) else ""
                
                next_question = (
                    f"Super, j'ai bien noté que vous utilisez le CRM : **{user_message_content}**.\n\n"
                    f"✓ **Félicitations !** Votre dossier est maintenant complet et a été automatiquement transmis à notre KAM : "
                    f"**{kam_name}** {kam_location}.\n\n"
                    f"Il/Elle prendra contact avec vous rapidement au **{dossier.phone}**.\n\n"
                    f"Vous pouvez également suivre l'avancement de votre commande dans votre **Espace Profil**."
                )
                
            ClientConversationMessage.objects.create(
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
                
            return Response({
                "ai_message": next_question,
                "extracted_profile": current_profile,
                "is_qualified": True,
                "recommendations": recommendations,
                "business_twin": business_twin_data
            }, status=status.HTTP_200_OK)
            
        # If not in awaiting info loop, but user wants to transmit to KAM
        elif is_qualified and wants_kam:
            if not dossier:
                dossier = ProspectDossier.objects.create(
                    conversation=conversation,
                    source=ProspectDossier.INBOUND_CONVERSATION,
                    status=ProspectDossier.NEW,
                    raw_qualification_data={"profile": current_profile}
                )
                
            # Check what fields are missing
            has_crm = dossier.raw_qualification_data and dossier.raw_qualification_data.get("crm")
            if dossier.contact_name and dossier.phone and dossier.rccm and dossier.billing_address and has_crm:
                # Already complete, transmit immediately!
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
                # Ask for the first missing field
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
                    
            ClientConversationMessage.objects.create(
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
                
            return Response({
                "ai_message": next_question,
                "extracted_profile": current_profile,
                "is_qualified": True,
                "recommendations": recommendations,
                "business_twin": business_twin_data
            }, status=status.HTTP_200_OK)

        # If already qualified and asking other queries (Dynamic general conversation)
        elif is_qualified:
            # Parse profile for any updates
            updated_profile = parse_message_for_profile(user_message_content, current_profile)
            conversation.extracted_profile = updated_profile
            conversation.save()
            
            # Generate recommendations and twin if not generated yet
            recommendations, business_twin_data = generate_recommendations_and_twin(updated_profile, conversation)
            
            # Formulate simulated dynamic response to specific B2B question
            if any(k in user_msg_lower for k in ["fibre", "gtr", "optique"]):
                next_question = (
                    "La **Fibre Optique Pro** d'Orange Business offre un très haut débit symétrique garanti avec une "
                    "Garantie de Temps de Rétablissement (GTR) de 4 heures. C'est l'idéal pour garantir la continuité d'activité de votre entreprise."
                )
            elif any(k in user_msg_lower for k in ["edr", "antivirus", "cyber", "virus", "pirat"]):
                next_question = (
                    "Notre solution **EDR & Antivirus Pro** offre une protection comportementale de pointe sur vos postes, "
                    "supervisée 24h/24 par nos experts du SOC (Security Operations Center) pour bloquer les menaces avancées."
                )
            elif any(k in user_msg_lower for k in ["firewall", "pare-feu", "vpn"]):
                next_question = (
                    "Le **Firewall Managé** protège l'accès à votre réseau d'entreprise et sécurise les connexions VPN pour vos collaborateurs à distance."
                )
            elif any(k in user_msg_lower for k in ["sd-wan", "multi-site", "interconnect"]):
                next_question = (
                    "Le **SD-WAN Managé** permet d'interconnecter intelligemment et de manière hautement sécurisée vos différents sites géographiques."
                )
            elif any(k in user_msg_lower for k in ["hds", "santé", "médical", "dossier patient"]):
                next_question = (
                    "Notre **Hébergement certifié HDS** est spécialement conçu pour héberger des données de santé en conformité totale avec la réglementation française."
                )
            elif any(k in user_msg_lower for k in ["téléphon", "teams", "voip", "appel"]):
                next_question = (
                    "La **Téléphonie Teams (VoIP)** intègre votre téléphonie d'entreprise directement dans l'application Microsoft Teams, éliminant le besoin de postes physiques fixes."
                )
            elif any(k in user_msg_lower for k in ["m365", "office", "excel", "outlook", "sharepoint"]):
                next_question = (
                    "La suite **Microsoft 365 Pro** vous fournit les licences d'outils de productivité (Outlook, Excel, Teams) avec une gestion de sécurité centralisée dans le cloud."
                )
            elif any(k in user_msg_lower for k in ["tarif", "prix", "coût", "combien"]):
                next_question = (
                    "Nos tarifs sont sur-mesure et s'adaptent à votre éligibilité réseau ainsi qu'au nombre d'utilisateurs. "
                    "Dès que vous transmettez votre dossier, un KAM vous proposera un devis personnalisé."
                )
            elif any(k in user_msg_lower for k in ["crm", "salesforce", "hubspot"]):
                next_question = (
                    "Onbora synchronise automatiquement vos qualifications avec votre CRM pour faciliter le suivi de votre dossier par le conseiller commercial."
                )
            elif any(k in user_msg_lower for k in ["twin", "jumeau", "roadmap"]):
                next_question = (
                    "Le **Business Twin** modélise vos besoins actifs face aux solutions cibles. La roadmap vous guide étape par étape dans la transition numérique."
                )
            else:
                next_question = (
                    "Je reste à votre entière disposition ! Vous pouvez me poser des questions sur nos offres (Fibre, EDR, HDS, Téléphonie Teams...) "
                    "ou me demander de **transmettre votre dossier à un conseiller KAM**."
                )
                
            ClientConversationMessage.objects.create(
                conversation=conversation,
                sender=ClientConversationMessage.AI,
                content=next_question
            )
            
            log_demo_event(
                'MESSAGE_SENT',
                f"Échange de messages dans la conversation #{conversation.id} (Dynamic)",
                user=request.user if request.user.is_authenticated else None,
                metadata={"conversation_id": conversation.id}
            )
            
            return Response({
                "ai_message": next_question,
                "extracted_profile": updated_profile,
                "is_qualified": True,
                "recommendations": recommendations,
                "business_twin": business_twin_data
            }, status=status.HTTP_200_OK)
            
        # Normal profile gathering flow (under 3 messages)
        else:
            updated_profile = parse_message_for_profile(user_message_content, current_profile)
            conversation.extracted_profile = updated_profile
            conversation.save()
            
            step_result = generate_next_step(updated_profile, message_count)
            next_question = step_result['next_question']
            is_qualified = step_result['is_qualified']
            
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
                        "\n\n⚠️ Votre qualification est terminée ! Pour générer le contrat Orange Business, "
                        "veuillez renseigner vos coordonnées administratives (Nom, Téléphone, RCCM, Adresse de facturation) dans votre Espace Profil."
                    )
                    
            ClientConversationMessage.objects.create(
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
                user=request.user if request.user.is_authenticated else None,
                metadata={"conversation_id": conversation.id}
            )
            
            if is_qualified:
                log_demo_event(
                    'QUALIFICATION_SUCCESS',
                    f"Qualification réussie pour l'entreprise #{conversation.id}",
                    user=request.user if request.user.is_authenticated else None,
                    metadata={"conversation_id": conversation.id}
                )
                
            return Response({
                "ai_message": next_question,
                "extracted_profile": updated_profile,
                "is_qualified": is_qualified,
                "recommendations": recommendations,
                "business_twin": business_twin_data
            }, status=status.HTTP_200_OK)


class ConversationRecommendationsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
            twin = BusinessTwin.objects.get(prospect_dossier=dossier)
            
            return Response({
                "recommendations": twin.recommended_services,
                "business_twin": {
                    "current_state": twin.current_state,
                    "proposed_state": twin.proposed_state,
                    "roadmap": twin.roadmap
                }
            }, status=status.HTTP_200_OK)
        except (ProspectDossier.DoesNotExist, BusinessTwin.DoesNotExist):
            # Not qualified or not generated yet
            return Response({
                "recommendations": [],
                "business_twin": None
            }, status=status.HTTP_200_OK)


class ConversationTransmitView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        # Get or create ProspectDossier
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
        except ProspectDossier.DoesNotExist:
            dossier = ProspectDossier.objects.create(
                conversation=conversation,
                source=ProspectDossier.INBOUND_CONVERSATION,
                status=ProspectDossier.NEW,
                raw_qualification_data={"profile": conversation.extracted_profile, "forced": True}
            )

        # Extract contract details
        contact_name = request.data.get('contact_name', '').strip()
        phone = request.data.get('phone', '').strip()
        rccm = request.data.get('rccm', '').strip()
        billing_address = request.data.get('billing_address', '').strip()
        only_save = request.data.get('only_save', False)
        
        dossier.contact_name = contact_name
        dossier.phone = phone
        dossier.rccm = rccm
        dossier.billing_address = billing_address
        dossier.is_complete = bool(contact_name and phone and rccm and billing_address)
        dossier.save()

        if not only_save:
            conversation.status = ClientConversation.TRANSMITTED
            conversation.save()
            
            # Trigger automated dispatching
            from kam.dispatch_engine import dispatch_dossier
            dispatch_dossier(dossier)
            
            log_demo_event(
                'DOSSIER_TRANSMITTED',
                f"Dossier Inbound transmis au KAM pour la conversation #{conversation.id}",
                user=request.user if request.user.is_authenticated else None,
                metadata={"conversation_id": conversation.id, "dossier_id": dossier.id}
            )
            detail_msg = "Dossier transmis au KAM avec succès."
        else:
            log_demo_event(
                'DOSSIER_UPDATED',
                f"Informations administratives enregistrées pour la conversation #{conversation.id}",
                user=request.user if request.user.is_authenticated else None,
                metadata={"conversation_id": conversation.id, "dossier_id": dossier.id}
            )
            detail_msg = "Informations enregistrées avec succès."
            
        return Response({
            "detail": detail_msg,
            "status": dossier.status,
            "dossier_details": {
                "id": dossier.id,
                "contact_name": dossier.contact_name,
                "phone": dossier.phone,
                "rccm": dossier.rccm,
                "billing_address": dossier.billing_address,
                "is_complete": dossier.is_complete,
                "status": dossier.status,
                "has_twin": bool(dossier.conversation and getattr(dossier.conversation, 'has_twin', False) or hasattr(dossier, 'businesstwin'))
            }
        }, status=status.HTTP_200_OK)


from onbora.exports import get_export_response

class ConversationExportView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
            twin = BusinessTwin.objects.get(prospect_dossier=dossier)
        except (ProspectDossier.DoesNotExist, BusinessTwin.DoesNotExist):
            return Response({"detail": "Le dossier ou le Business Twin n'est pas encore qualifié."}, status=status.HTTP_400_BAD_REQUEST)
            
        log_demo_event(
            'PDF_EXPORTED',
            f"Business Twin exporté en PDF/HTML pour la conversation #{conversation.id}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"conversation_id": conversation.id}
        )
        
        use_pdf = request.GET.get('format', 'pdf') == 'pdf'
        doc_type = request.GET.get('type', 'twin')
        
        if use_pdf:
            from onbora.exports import generate_reportlab_pdf_response
            # Map conversation object to generate twin ReportLab
            return generate_reportlab_pdf_response(doc_type, conversation)
        
        title = f"Business Twin Onbora - {conversation.client.company_name if (conversation.client and conversation.client.company_name) else 'Votre Entreprise'}"
        
        current_items = "".join([f"<li>⚠️ {item}</li>" for item in (twin.current_state or [])])
        proposed_items = "".join([f"<li>✓ {item}</li>" for item in (twin.proposed_state or [])])
        
        services_items = ""
        for s in (twin.recommended_services or []):
            services_items += f"""
            <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
                    <span>{s.get('name')}</span>
                    <span class="badge badge-success">{s.get('priority')}</span>
                </div>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">{s.get('reasoning')}</p>
            </div>
            """
            
        roadmap_items = ""
        for idx, step in enumerate(twin.roadmap or []):
            roadmap_items += f"""
            <div class="timeline-item">
                <p class="timeline-title">Étape {idx+1}</p>
                <p class="timeline-desc">{step}</p>
            </div>
            """
            
        content_html = f"""
        <h2 class="document-title">SYNTHÈSE DE QUALIFICATION B2B & BUSINESS TWIN</h2>
        
        <div class="section">
            <h3 class="section-title">Informations Générales</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Entreprise :</strong> {conversation.client.company_name if (conversation.client and conversation.client.company_name) else 'Inbound Portal'}</li>
                    <li><strong>Date de qualification :</strong> {dossier.created_at.strftime('%d/%m/%Y')}</li>
                    <li><strong>Origine :</strong> Qualification Inbound</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Étude comparative (Business Twin)</h3>
            <div class="grid">
                <div class="card" style="border-color: #cbd5e1; background-color: #f8fafc;">
                    <p class="card-title" style="color: #64748b;">Situation Initiale (Avant)</p>
                    <ul class="list-unstyled">
                        {current_items}
                    </ul>
                </div>
                <div class="card" style="border-color: #fed7aa; background-color: #fff7ed;">
                    <p class="card-title" style="color: #ea580c;">Situation Proposée (Après)</p>
                    <ul class="list-unstyled">
                        {proposed_items}
                    </ul>
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Services MSP Préconisés</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                {services_items}
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Roadmap de déploiement</h3>
            <div class="timeline">
                {roadmap_items}
            </div>
        </div>
        """
        
        return get_export_response(f"business_twin_{pk}", title, content_html)


class ConversationDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = ClientConversationSerializer(conversation)
        return Response(serializer.data)

