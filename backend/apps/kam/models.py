import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
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


class RelationshipCoverage(models.Model):
    """
    Cartographie relationnelle des décideurs et parties prenantes d'un compte PME ou Grand Compte.
    Permet au KAM de piloter le multi-threading et de détecter le risque de mono-champion.
    """
    ROLE_CLASSIFICATION_CHOICES = [
        ('ECONOMIC_BUYER', 'Acheteur Économique (DG, DAF, Propriétaire)'),
        ('TECH_DECIDER', 'Décideur Technique (DSI, Responsable IT)'),
        ('CHAMPION', 'Champion Interne (Sponsor pro-MSP)'),
        ('DETRACTOR', 'Détracteur / Bloqueur (Soutien concurrent)'),
        ('END_USER', 'Utilisateur Final / Métier'),
        ('GATEKEEPER', 'Contrôleur d\'accès / Secrétaire général'),
    ]
    INFLUENCE_LEVEL_CHOICES = [
        ('HIGH', 'Influence Majeure / Décisionnaire direct'),
        ('MEDIUM', 'Influence Forte / Prescripteur'),
        ('LOW', 'Influence Faible / Consultatif'),
    ]
    COVERAGE_STATUS_CHOICES = [
        ('COVERED', 'Couvert (Relation active prouvée < 60j)'),
        ('SINGLE_POINT_OF_FAILURE', 'Point Unique de Défaillance (Mono-champion)'),
        ('MISSING', 'Identifié mais non rencontré / Non couvert'),
        ('UNKNOWN', 'Rôle non identifié dans l\'entreprise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='relationship_coverages',
        help_text="Entreprise (PME ou Grand Compte) pilotée par le KAM"
    )
    contact_name = models.CharField(max_length=150, help_text="Nom complet de l'interlocuteur")
    contact_role = models.CharField(max_length=100, help_text="Titre officiel dans l'entreprise (ex: DAF, DSI)")
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    role_classification = models.CharField(
        max_length=30,
        choices=ROLE_CLASSIFICATION_CHOICES,
        default='CHAMPION',
        db_index=True
    )
    influence_level = models.CharField(
        max_length=10,
        choices=INFLUENCE_LEVEL_CHOICES,
        default='MEDIUM'
    )
    coverage_status = models.CharField(
        max_length=30,
        choices=COVERAGE_STATUS_CHOICES,
        default='MISSING',
        db_index=True
    )
    is_mono_champion_risk = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Vrai si l'opportunité dépend exclusivement de ce seul contact"
    )
    last_interaction_at = models.DateTimeField(null=True, blank=True, help_text="Date de la dernière interaction prouvée")
    last_interaction_proof = models.ForeignKey(
        'sales.Evidence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_interactions',
        help_text="Preuve formelle de la dernière interaction"
    )
    notes = models.TextField(blank=True, default='', help_text="Notes de posture, attentes et motivations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['enterprise', '-influence_level', 'contact_name']
        verbose_name = "Couverture Relationnelle"
        verbose_name_plural = "Couvertures Relationnelles"

    def __str__(self):
        return f"{self.contact_name} ({self.get_role_classification_display()}) - {self.enterprise.name}"


class SyncOperation(models.Model):
    """
    Outbox transactionnelle PostgreSQL pour la synchronisation asynchrone et résiliente
    vers Microsoft Dynamics 365 Dataverse (Epic 4).
    Garantit zéro écriture CRM directe bloquante dans le cycle de requête HTTP.
    """
    TARGET_SYSTEM_CHOICES = [
        ('DYNAMICS_365', 'Microsoft Dynamics 365 Dataverse'),
        ('KAABU', 'CRM Kaabu Orange'),
    ]
    ENTITY_TYPE_CHOICES = [
        ('ACCOUNT', 'Compte Entreprise (account)'),
        ('APPOINTMENT', 'Rendez-vous / Compte-rendu (appointment)'),
        ('CONTACT', 'Contact / Partie prenante (contact)'),
        ('OPPORTUNITY', 'Opportunité B2B (opportunity)'),
    ]
    OPERATION_CHOICES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Mise à jour'),
        ('UPSERT', 'Création ou Mise à jour'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'En attente de traitement par le worker'),
        ('PROCESSING', 'En cours d\'exécution'),
        ('SUCCEEDED', 'Synchronisé avec succès dans Dynamics'),
        ('FAILED', 'Échec définitif après réessais'),
        ('CONFLICT', 'Conflit de version OData nécessitant arbitrage'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    target_system = models.CharField(max_length=30, choices=TARGET_SYSTEM_CHOICES, default='DYNAMICS_365', db_index=True)
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True, help_text="ID interne de l'entité Onbora")
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES, default='UPSERT')
    payload = models.JSONField(default=dict, help_text="Schéma formaté pour l'API Dataverse OData v9.2")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=5)
    last_error = models.TextField(blank=True, default='')
    remote_id = models.CharField(max_length=150, blank=True, default='', help_text="GUID distant Dataverse retourné")
    scheduled_at = models.DateTimeField(default=timezone.now, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']
        verbose_name = "Opération de Synchronisation Outbox"
        verbose_name_plural = "Opérations de Synchronisation Outbox"

    def __str__(self):
        return f"Sync [{self.target_system}] {self.entity_type} #{self.entity_id} -> {self.status} (Essai {self.retry_count}/{self.max_retries})"


class AccountMemoryEvent(models.Model):
    """
    Registre immuable de la mémoire de compte (Epic 5).
    Consigne les décisions stratégiques, promesses commerciales, litiges SLA et jalons
    pour garantir la continuité de compte et alimenter le dossier de passation (Handover).
    """
    EVENT_TYPES = [
        ('DECISION', 'Décision Stratégique Validée'),
        ('PROMISE', 'Promesse Commerciale / Engagement FAI'),
        ('INCIDENT', 'Incident Majeur / Litige SLA'),
        ('MILESTONE', 'Jalon Contractuel / Avenant'),
        ('ORGANIZATION_CHANGE', 'Changement dans l\'Organigramme Client'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='memory_events',
        help_text="Compte concerné par l'événement de mémoire"
    )
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, db_index=True)
    summary = models.CharField(max_length=255, help_text="Titre concis de l'événement")
    details = models.TextField(help_text="Description factuelle, engagements et contexte")
    occurred_at = models.DateTimeField(db_index=True, help_text="Date réelle à laquelle l'événement s'est produit")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logged_account_events',
        help_text="KAM ou manager ayant consigné l'événement"
    )
    evidence = models.ForeignKey(
        'sales.Evidence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='memory_events',
        help_text="Preuve formelle associée (rapport, email, observation)"
    )
    is_critical = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Drapeau d'attention prioritaire lors de la passation de compte"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-occurred_at', '-created_at']
        verbose_name = "Événement Mémoire de Compte"
        verbose_name_plural = "Événements Mémoire de Compte"

    def __str__(self):
        return f"[{self.get_event_type_display()}] {self.enterprise.name} : {self.summary}"




