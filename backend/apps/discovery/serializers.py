from rest_framework import serializers
from .models import ClientConversation, ClientConversationMessage

class ClientConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientConversationMessage
        fields = ['id', 'sender', 'content', 'created_at']

class ClientConversationSerializer(serializers.ModelSerializer):
    messages = ClientConversationMessageSerializer(many=True, read_only=True)
    dossier_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientConversation
        fields = ['id', 'client', 'status', 'channel', 'extracted_profile', 'messages', 'dossier_details', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'status', 'extracted_profile', 'created_at', 'updated_at']

    def get_dossier_details(self, obj):
        dossier = obj.dossiers.first()
        if dossier:
            from kam.serializers import ProspectDossierSerializer
            return ProspectDossierSerializer(dossier).data
        return None
