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
        
        # 2. Run profiling and next step generation
        current_profile = conversation.extracted_profile
        message_count = conversation.messages.filter(sender=ClientConversationMessage.USER).count()
        
        updated_profile = parse_message_for_profile(user_message_content, current_profile)
        conversation.extracted_profile = updated_profile
        conversation.save()
        
        step_result = generate_next_step(updated_profile, message_count)
        next_question = step_result['next_question']
        is_qualified = step_result['is_qualified']
        
        # 3. Save AI question
        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.AI,
            content=next_question
        )
        
        recommendations = []
        business_twin_data = None
        
        # 4. If qualified, generate twin and matches
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
            
        # Check if dossier exists
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
        except ProspectDossier.DoesNotExist:
            # Create a fallback dossier if not fully qualified but forced transmission
            dossier = ProspectDossier.objects.create(
                conversation=conversation,
                source=ProspectDossier.INBOUND_CONVERSATION,
                status=ProspectDossier.NEW,
                raw_qualification_data={"profile": conversation.extracted_profile, "forced": True}
            )
            
        conversation.status = ClientConversation.TRANSMITTED
        conversation.save()
        
        dossier.status = ProspectDossier.NEW
        dossier.save()
        
        log_demo_event(
            'DOSSIER_TRANSMITTED',
            f"Dossier Inbound transmis au KAM pour la conversation #{conversation.id}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"conversation_id": conversation.id, "dossier_id": dossier.id}
        )
        
        return Response({
            "detail": "Dossier transmis au KAM avec succès.",
            "status": dossier.status
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

