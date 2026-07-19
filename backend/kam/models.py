from django.db import models
from django.conf import settings
from discovery.models import ClientConversation

class ProspectDossier(models.Model):
    INBOUND_CONVERSATION = 'INBOUND_CONVERSATION'
    OUTBOUND_VISIT = 'OUTBOUND_VISIT'
    
    SOURCE_CHOICES = [
        (INBOUND_CONVERSATION, 'Conversation en ligne'),
        (OUTBOUND_VISIT, 'Visite commerciale terrain'),
    ]
    
    NEW = 'NEW'
    IN_REVIEW = 'IN_REVIEW'
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'
    
    STATUS_CHOICES = [
        (NEW, 'Nouveau'),
        (IN_REVIEW, 'En revue'),
        (ACCEPTED, 'Accepté'),
        (REJECTED, 'Rejeté'),
    ]
    
    source = models.CharField(
        max_length=30,
        choices=SOURCE_CHOICES,
        default=INBOUND_CONVERSATION
    )
    conversation = models.ForeignKey(
        ClientConversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dossiers'
    )
    visit_report = models.ForeignKey(
        'sales.VisitReport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dossiers'
    )
    kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'KAM'},
        related_name='assigned_dossiers'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=NEW
    )
    raw_qualification_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Consolidation des données de qualification (besoins, contraintes, outils actuels)"
    )
    internal_kam_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        source_name = "Inbound" if self.source == self.INBOUND_CONVERSATION else "Outbound"
        return f"Dossier #{self.id} ({source_name} - {self.get_status_display()})"
