from django.db import models
from django.conf import settings

class DemoEvent(models.Model):
    EVENT_TYPES = (
        ('CONVERSATION_STARTED', 'Début de conversation inbound'),
        ('MESSAGE_SENT', 'Message envoyé'),
        ('CONVERSATION_SUCCESS', 'Conversation réussie'),
        ('DOSSIER_TRANSMITTED', 'Dossier transmis au KAM'),
        ('REPORT_GENERATED', 'Rapport commercial généré'),
        ('INTERNAL_NOTES_UPDATED', 'Notes internes KAM modifiées'),
        ('PDF_EXPORTED', 'PDF exporté'),
        ('DOSSIER_DISPATCHED', 'Dossier affecté au KAM'),
        ('CRM_SYNCHRONIZED', 'Données synchronisées au CRM'),
        ('DOSSIER_IN_REVIEW', 'Dossier en revue par le KAM'),
        ('CLIENT_CONTACTED', 'Client contacté par le KAM'),
        ('MEETING_SCHEDULED', 'Rendez-vous planifié'),
        ('NEGOTIATION_STARTED', 'Négociation commencée'),
        ('APPROVAL_REQUESTED', 'Validation demandée'),
        ('DOSSIER_APPROVED', 'Dossier validé'),
        ('ORDER_PLACED', 'Commande passée sur le SI'),
        ('PROVISIONING_STARTED', 'Provisioning réseau démarré'),
        ('PROVISIONING_COMPLETED', 'Provisioning réseau complété'),
        ('ACTIVATION_STARTED', 'Activation démarrée'),
        ('DOSSIER_ACTIVE', 'Ligne active / Livrée'),
        ('DOSSIER_REJECTED', 'Dossier rejeté / Perdu'),
    )
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    description = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demo_events'
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.created_at}"
