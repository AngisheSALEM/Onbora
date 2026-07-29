from django.contrib import admin
from .models import ClientConversation, ClientConversationMessage

@admin.register(ClientConversation)
class ClientConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'status', 'channel', 'created_at']
    list_filter = ['status', 'channel']
    search_fields = ['client__username']

@admin.register(ClientConversationMessage)
class ClientConversationMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'created_at']
    list_filter = ['sender']
    search_fields = ['content']
