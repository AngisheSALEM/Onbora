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


class KamAppointment(models.Model):
    MEETING_TYPES = [
        ('PHYSICAL', 'Visite Terrain (Physique)'),
        ('GOOGLE_MEET', 'Google Meet / Visioconférence'),
        ('CALL', 'Appel Téléphonique'),
    ]
    STATUS_CHOICES = [
        ('SCHEDULED', 'Planifié'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Effectué / Rapport généré'),
        ('CANCELLED', 'Annulé'),
    ]

    kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kam_appointments'
    )
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='kam_appointments'
    )
    title = models.CharField(max_length=200)
    meeting_type = models.CharField(max_length=20, choices=MEETING_TYPES, default='PHYSICAL')
    scheduled_at = models.DateTimeField()
    duration_minutes = models.IntegerField(default=45)
    location = models.CharField(max_length=255, blank=True, default='')
    meet_url = models.URLField(blank=True, default='')
    contact_name = models.CharField(max_length=150, blank=True, default='')
    contact_role = models.CharField(max_length=100, blank=True, default='')
    objective = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.title} - {self.enterprise.name} ({self.scheduled_at.strftime('%d/%m/%Y %H:%M')})"


class KamVisitReport(models.Model):
    appointment = models.OneToOneField(
        KamAppointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='report'
    )
    kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kam_visit_reports'
    )
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='kam_visit_reports'
    )
    raw_transcript = models.TextField(blank=True, default='')
    audio_file_path = models.CharField(max_length=255, blank=True, default='')
    executive_summary = models.TextField(blank=True, default='')
    confirmed_needs = models.JSONField(default=list, blank=True)
    objections_raised = models.JSONField(default=list, blank=True)
    actions_todo = models.JSONField(default=list, blank=True)
    follow_up_email_draft = models.TextField(blank=True, default='')
    bant_scores = models.JSONField(default=dict, blank=True)
    conversion_status = models.CharField(max_length=30, default='IN_NEGOTIATION')
    crm_sync_status = models.CharField(
        max_length=30,
        choices=[
            ('PENDING', 'En attente'),
            ('SYNCED_DYNAMICS', 'Synchronisé Dynamics 365'),
            ('FAILED', 'Erreur de synchronisation'),
        ],
        default='PENDING'
    )
    crm_payload = models.JSONField(default=dict, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Rapport KAM: {self.enterprise.name} ({self.created_at.strftime('%d/%m/%Y')})"


class PreCallBriefing(models.Model):
    kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pre_call_briefings'
    )
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='pre_call_briefings'
    )
    company_overview = models.JSONField(default=dict, blank=True)
    key_decision_makers = models.JSONField(default=list, blank=True)
    detected_business_challenges = models.JSONField(default=list, blank=True)
    custom_pitch_angles = models.JSONField(default=list, blank=True)
    critical_discovery_questions = models.JSONField(default=list, blank=True)
    golden_rules = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Briefing Pre-Call: {self.enterprise.name} ({self.kam.username})"

