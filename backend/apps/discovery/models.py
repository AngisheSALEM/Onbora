import uuid
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


# ============================================================================
# EPIC 2 : MOTEUR DE QUALIFICATION DOUBLE SEGMENT & BASCULE SOHO -> KAM
# ============================================================================

class QualificationRecord(models.Model):
    """
    Enregistrement immuable d'une session de qualification terrain ou bureau.
    Traite la saisie des questions et consigne la bascule éventuelle de segment.
    """
    SEGMENT_CHOICES = [
        ('SOHO', 'SOHO / TPE'),
        ('PME', 'PME (Petites et Moyennes Entreprises)'),
        ('KAM', 'Grand Compte / Compte Stratégique'),
    ]
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'En cours de qualification'),
        ('COMPLETED', 'Qualification complétée'),
        ('PIVOTED', 'Requalifiée / Bascule de segment effectuée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='qualifications',
        help_text="Entreprise qualifiée"
    )
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_qualifications',
        help_text="Agent ayant mené la découverte (Commercial SOHO ou KAM)"
    )
    initial_segment = models.CharField(
        max_length=20,
        choices=SEGMENT_CHOICES,
        default='SOHO',
        help_text="Segment attribué avant la qualification"
    )
    effective_segment = models.CharField(
        max_length=20,
        choices=SEGMENT_CHOICES,
        default='SOHO',
        help_text="Segment résultant après évaluation des règles métier"
    )
    pivot_triggered = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Vrai si un dépassement de seuil a déclenché un pivot vers un segment supérieur"
    )
    pivot_reason = models.TextField(
        blank=True,
        default='',
        help_text="Explication factuelle et déterministe de la bascule"
    )
    completeness_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.00,
        help_text="Score de complétude (0.00 à 1.00)"
    )
    answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Ensemble structuré des réponses aux questions de découverte"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='COMPLETED',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Session de Qualification"
        verbose_name_plural = "Sessions de Qualification"

    def __str__(self):
        pivot_str = f" [PIVOT -> {self.effective_segment}]" if self.pivot_triggered else ""
        return f"Qualification {self.enterprise.name} ({self.effective_segment}){pivot_str}"


class HandoffDossier(models.Model):
    """
    Dossier de passation formel émis lors d'une requalification montante (Segment Pivot)
    ou d'un transfert de compte entre rôles.
    Transmis par le prospecteur/prestataire SOHO et réceptionné par le KAM titulaire.
    """
    FROM_ROLE_CHOICES = [
        ('SOHO_REPRESENTATIVE', 'Prospecteur / Prestataire Terrain SOHO'),
        ('OUTGOING_KAM', 'KAM Sortant (Passation interne)'),
        ('FIELD_PROSPECTOR', 'Commercial Terrain'),
    ]
    TARGET_SEGMENT_CHOICES = [
        ('PME', 'PME (Petites et Moyennes Entreprises)'),
        ('KAM', 'Grand Compte / Compte Stratégique'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'En attente de prise en charge KAM'),
        ('ACCEPTED', 'Accepté & Intégré au portefeuille KAM'),
        ('RETURNED', 'Renvoyé au prospecteur (Non éligible PME)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        'sales.Enterprise',
        on_delete=models.CASCADE,
        related_name='handoff_dossiers',
        help_text="Compte requalifié nécessitant prise en charge"
    )
    qualification = models.ForeignKey(
        QualificationRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handoff_dossiers',
        help_text="Session de qualification à l'origine du pivot"
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_handoffs',
        help_text="Agent émetteur de la passation (Prospecteur SOHO)"
    )
    from_role = models.CharField(
        max_length=30,
        choices=FROM_ROLE_CHOICES,
        default='SOHO_REPRESENTATIVE'
    )
    to_kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_handoffs',
        limit_choices_to={'role': 'KAM'},
        help_text="KAM assigné à la prise en charge"
    )
    target_segment = models.CharField(
        max_length=20,
        choices=TARGET_SEGMENT_CHOICES,
        default='PME'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    transfer_notes = models.TextField(
        blank=True,
        default='',
        help_text="Synthèse des constats terrain et justification du potentiel PME"
    )
    return_reason = models.TextField(
        blank=True,
        default='',
        help_text="Motif explicatif en cas de retour au prospecteur"
    )
    transferred_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decided_handoffs'
    )

    class Meta:
        ordering = ['-transferred_at']
        verbose_name = "Dossier de Handoff (Bascule)"
        verbose_name_plural = "Dossiers de Handoff (Bascules)"

    def __str__(self):
        return f"Handoff {self.enterprise.name} ({self.get_status_display()}) -> {self.target_segment}"
