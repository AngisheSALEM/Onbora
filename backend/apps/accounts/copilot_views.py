import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UserAIAssistant, AIAssistantConversation, AIAssistantMessage
from .copilot_service import get_or_create_assistant, process_copilot_turn


class CopilotProfileView(APIView):
    """
    GET: Récupère la fiche d'identité et les autorisations de l'assistant IA du compte.
    PATCH: Permet à l'utilisateur de renommer son assistant ou de modifier ses préférences.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assistant = get_or_create_assistant(request.user)
        return Response({
            "assistant_id": str(assistant.id),
            "name": assistant.name,
            "role_scope": assistant.role_scope,
            "role_display": request.user.get_role_display(),
            "allowed_actions": assistant.allowed_actions,
            "avatar": assistant.avatar or "bot",
            "system_prompt": assistant.system_prompt,
            "user_id": request.user.id,
            "user_name": request.user.first_name or request.user.username,
            "created_at": assistant.created_at.isoformat(),
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        assistant = get_or_create_assistant(request.user)
        data = request.data
        if 'name' in data and str(data['name']).strip():
            assistant.name = str(data['name']).strip()
        if 'avatar' in data:
            assistant.avatar = str(data['avatar']).strip()
        assistant.save()

        return Response({
            "message": "Assistant IA mis à jour avec succès.",
            "assistant_id": str(assistant.id),
            "name": assistant.name,
            "avatar": assistant.avatar,
        }, status=status.HTTP_200_OK)


class CopilotConversationListView(APIView):
    """
    GET: Liste les sessions de conversation de l'assistant.
    POST: Démarre une nouvelle session conversationnelle.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assistant = get_or_create_assistant(request.user)
        conversations = AIAssistantConversation.objects.filter(assistant=assistant).order_by('-updated_at')
        
        data = []
        for c in conversations:
            last_msg = c.messages.last()
            data.append({
                "id": str(c.id),
                "title": c.title,
                "is_pinned": c.is_pinned,
                "messages_count": c.messages.count(),
                "last_message": last_msg.content[:80] if last_msg else "",
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            })

        return Response({"conversations": data}, status=status.HTTP_200_OK)

    def post(self, request):
        assistant = get_or_create_assistant(request.user)
        title = request.data.get('title', 'Nouvelle session').strip() or 'Nouvelle session'
        conv = AIAssistantConversation.objects.create(
            assistant=assistant,
            title=title
        )
        return Response({
            "id": str(conv.id),
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class CopilotMessageListView(APIView):
    """
    GET: Récupère l'historique complet des messages d'une session.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        assistant = get_or_create_assistant(request.user)
        try:
            conv = AIAssistantConversation.objects.get(id=conversation_id, assistant=assistant)
        except AIAssistantConversation.DoesNotExist:
            return Response({"detail": "Session introuvable."}, status=status.HTTP_404_NOT_FOUND)

        messages = conv.messages.all().order_by('created_at')
        data = []
        for m in messages:
            data.append({
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "action_type": m.action_type,
                "action_payload": m.action_payload,
                "action_result": m.action_result,
                "action_status": m.action_status,
                "created_at": m.created_at.isoformat(),
            })

        return Response({
            "conversation_id": str(conv.id),
            "title": conv.title,
            "messages": data
        }, status=status.HTTP_200_OK)


class CopilotChatView(APIView):
    """
    POST: Dialogue conversationnel avec le Copilote IA.
    Traite la saisie utilisateur (texte ou voix transcrite), exécute les actions
    métier selon les autorisations du compte et renvoie la réponse et les cartes d'action.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        assistant = get_or_create_assistant(request.user)
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({"detail": "Le message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)

        # Récupération ou création de la session de conversation
        conversation_id = request.data.get('conversation_id')
        conv = None
        if conversation_id:
            try:
                conv = AIAssistantConversation.objects.get(id=conversation_id, assistant=assistant)
            except AIAssistantConversation.DoesNotExist:
                conv = None

        if not conv:
            # Générer un titre concis à partir du premier message
            snippet = user_message[:40].replace('\n', ' ')
            title = f"Session : {snippet}..." if len(user_message) > 40 else snippet
            conv = AIAssistantConversation.objects.create(
                assistant=assistant,
                title=title or "Nouvelle session"
            )

        # Exécution du tour de dialogue avec le moteur Copilot
        assistant_msg = process_copilot_turn(assistant, conv, user_message)

        return Response({
            "conversation_id": str(conv.id),
            "message": {
                "id": str(assistant_msg.id),
                "role": assistant_msg.role,
                "content": assistant_msg.content,
                "action_type": assistant_msg.action_type,
                "action_payload": assistant_msg.action_payload,
                "action_result": assistant_msg.action_result,
                "action_status": assistant_msg.action_status,
                "created_at": assistant_msg.created_at.isoformat(),
            },
            "assistant": {
                "id": str(assistant.id),
                "name": assistant.name,
            }
        }, status=status.HTTP_200_OK)
