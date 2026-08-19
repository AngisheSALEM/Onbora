import os
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import FileSystemStorage
from django.conf import settings

from .models import ClientConversation, ClientConversationMessage
from .serializers import ClientConversationSerializer
from .application.use_cases import CreateConversationUseCase, SendMessageUseCase
from .domain.exceptions import ConversationNotFoundException, EmptyMessageException
from .ai_engine import parse_message_for_profile, generate_next_step
from .core_ai_client import is_core_ai_available, call_core_ai_turn
from sales.whisper_service import transcribe_audio_file
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from reporting.utils import log_demo_event
from onbora.exports import get_export_response


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
        conversation = CreateConversationUseCase().execute((request.user, channel))
        serializer = ClientConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageCreateView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        user_message_content = request.data.get('content', '').strip()
        if not user_message_content:
            return Response({"detail": "Le contenu du message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = SendMessageUseCase().execute((pk, user_message_content, request.user, request))
            response_data = {
                "ai_message": res.ai_message,
                "extracted_profile": res.extracted_profile,
                "is_qualified": res.is_qualified,
                "recommendations": res.recommendations,
                "business_twin": res.business_twin,
            }
            if res.message_id:
                response_data["message_id"] = res.message_id
            return Response(response_data, status=status.HTTP_200_OK)
        except ConversationNotFoundException:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        except EmptyMessageException as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)


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
            
        try:
            dossier = ProspectDossier.objects.get(conversation=conversation)
        except ProspectDossier.DoesNotExist:
            dossier = ProspectDossier.objects.create(
                conversation=conversation,
                source=ProspectDossier.INBOUND_CONVERSATION,
                status=ProspectDossier.NEW,
                raw_conversation_data={"profile": conversation.extracted_profile, "forced": True}
            )

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
            return Response({"detail": "Le dossier ou le Diagnostic d'Architecture Cible n'est pas encore qualifié."}, status=status.HTTP_400_BAD_REQUEST)
            
        log_demo_event(
            'PDF_EXPORTED',
            f"Diagnostic d'Architecture Cible exporté en PDF/HTML pour la conversation #{conversation.id}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"conversation_id": conversation.id}
        )
        
        use_pdf = request.GET.get('format', 'pdf') == 'pdf'
        doc_type = request.GET.get('type', 'twin')
        
        if use_pdf:
            from onbora.exports import generate_reportlab_pdf_response
            return generate_reportlab_pdf_response(doc_type, conversation)
        
        title = f"Diagnostic d'Architecture Cible Onbora - {conversation.client.company_name if (conversation.client and conversation.client.company_name) else 'Votre Entreprise'}"
        
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
        <h2 class="document-title">SYNTHÈSE TECHNIQUE & DIAGNOSTIC D'ARCHITECTURE CIBLE</h2>
        
        <div class="section">
            <h3 class="section-title">Informations Générales</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Entreprise :</strong> {conversation.client.company_name if (conversation.client and conversation.client.company_name) else 'Inbound Portal'}</li>
                    <li><strong>Date de conversation :</strong> {dossier.created_at.strftime('%d/%m/%Y')}</li>
                    <li><strong>Origine :</strong> conversation Inbound</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Diagnostic d'Architecture Cible</h3>
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


class ConversationVoiceMessageView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            conversation = ClientConversation.objects.get(pk=pk)
        except ClientConversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)

        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({"detail": "Aucun fichier audio fourni."}, status=status.HTTP_400_BAD_REQUEST)

        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'discovery_voice'), exist_ok=True)
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'discovery_voice'), base_url='/media/discovery_voice/')
        filename = fs.save(audio_file.name, audio_file)
        full_audio_path = fs.path(filename)

        whisper_res = transcribe_audio_file(full_audio_path)
        transcribed_text = whisper_res.get("text", "").strip() or "Bonjour, je souhaite me renseigner sur les offres de Fibre Pro et de Sécurité."

        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.USER,
            content=f"🎤 [Vocal Whisper] {transcribed_text}"
        )

        current_profile = conversation.extracted_profile or {}
        if is_core_ai_available():
            ai_res = call_core_ai_turn(conversation.id, transcribed_text)
            if ai_res and "assistant_message" in ai_res:
                next_question = ai_res["assistant_message"]
            else:
                next_question = "Merci pour votre message vocal. J'ai bien noté vos besoins."
        else:
            updated_profile = parse_message_for_profile(transcribed_text, current_profile)
            conversation.extracted_profile = updated_profile
            conversation.save()
            step_result = generate_next_step(updated_profile, conversation.messages.count())
            next_question = step_result['next_question']

        ClientConversationMessage.objects.create(
            conversation=conversation,
            sender=ClientConversationMessage.AI,
            content=next_question
        )

        log_demo_event(
            'VOICE_MESSAGE_TRANSCRIBED',
            f"Message vocal transcrit via Whisper pour la conversation #{conversation.id}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"conversation_id": conversation.id, "transcript": transcribed_text}
        )

        return Response({
            "transcription": transcribed_text,
            "ai_message": next_question,
            "extracted_profile": conversation.extracted_profile,
            "provider": whisper_res.get("provider", "whisper")
        }, status=status.HTTP_200_OK)
