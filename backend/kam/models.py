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
    
    DRAFT = 'DRAFT'
    QUALIFYING = 'QUALIFYING'
    NEW = 'NEW'
    DISPATCHED = 'DISPATCHED'
    IN_REVIEW = 'IN_REVIEW'
    ESTIMATE_PREPARED = 'ESTIMATE_PREPARED'
    NEGOTIATION = 'NEGOTIATION'
    ACCEPTED = 'ACCEPTED'
    PROVISIONING = 'PROVISIONING'
    COMPLETED = 'COMPLETED'
    TRAINING = 'TRAINING'
    REJECTED = 'REJECTED'
    
    STATUS_CHOICES = [
        (DRAFT, 'Brouillon'),
        (QUALIFYING, 'conversation en cours'),
        (NEW, 'Nouveau / Qualifié'),
        (DISPATCHED, 'Affecté au KAM'),
        (IN_REVIEW, 'En revue'),
        (ESTIMATE_PREPARED, 'Proposition commerciale rédigée'),
        (NEGOTIATION, 'En négociation'),
        (ACCEPTED, 'Signé / Accepté'),
        (PROVISIONING, 'Provisioning technique'),
        (COMPLETED, 'Installé / Opérationnel'),
        (TRAINING, 'En cours d\'adoption / Formation'),
        (REJECTED, 'Rejeté / Perdu'),
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
    contact_name = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    rccm = models.CharField(max_length=100, blank=True, default='', help_text="Numéro d'immatriculation RCCM")
    billing_address = models.TextField(blank=True, default='', help_text="Adresse complète de facturation")
    is_complete = models.BooleanField(default=False, help_text="Indique si le dossier contractuel est complet")
    raw_conversation_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Consolidation des données de conversation (besoins, contraintes, outils actuels)"
    )
    internal_kam_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        source_name = "Inbound" if self.source == self.INBOUND_CONVERSATION else "Outbound"
        return f"Dossier #{self.id} ({source_name} - {self.get_status_display()})"
