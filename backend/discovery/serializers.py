from rest_framework import serializers
from .models import ClientConversation, ClientConversationMessage

class ClientConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientConversationMessage
        fields = ['id', 'sender', 'content', 'created_at']

class ClientConversationSerializer(serializers.ModelSerializer):
    messages = ClientConversationMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ClientConversation
        fields = ['id', 'client', 'status', 'channel', 'extracted_profile', 'messages', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'status', 'extracted_profile', 'created_at', 'updated_at']
