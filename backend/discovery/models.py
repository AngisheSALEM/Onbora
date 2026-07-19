from django.db import models
from django.conf import settings

class ClientConversation(models.Model):
    ACTIVE = 'ACTIVE'
    ARCHIVED = 'ARCHIVED'
    TRANSMITTED = 'TRANSMITTED'
    
    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (ARCHIVED, 'Archivée'),
        (TRANSMITTED, 'Transmise au KAM'),
    ]
    
    PORTAL = 'PORTAL'
    WIDGET = 'WIDGET'
    MAXIT = 'MAXIT'
    
    CHANNEL_CHOICES = [
        (PORTAL, 'Portail MSP'),
        (WIDGET, 'Widget Externe'),
        (MAXIT, 'Mini-App Maxit'),
    ]
    
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=ACTIVE
    )
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
        default=PORTAL
    )
    extracted_profile = models.JSONField(
        default=dict,
        blank=True,
        help_text="Profil dynamique extrait des besoins (secteur, taille, problèmes, outils, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        client_name = self.client.username if self.client else "Anonyme"
        return f"Conversation #{self.id} ({client_name} - {self.get_status_display()})"


class ClientConversationMessage(models.Model):
    USER = 'USER'
    AI = 'AI'
    
    SENDER_CHOICES = [
        (USER, 'Utilisateur'),
        (AI, 'Intelligence Artificielle'),
    ]
    
    conversation = models.ForeignKey(
        ClientConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.CharField(
        max_length=10,
        choices=SENDER_CHOICES
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message #{self.id} in #{self.conversation.id} by {self.sender}"
