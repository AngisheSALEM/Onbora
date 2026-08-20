from django.db import models
from django.conf import settings


class Plaque(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Code unique de la plaque (ex: KIN-GOMBE)")
    name = models.CharField(max_length=150, help_text="Nom complet (ex: Kinshasa - Gombe)")
    city = models.CharField(max_length=100, default="Kinshasa")
    latitude = models.FloatField(default=-4.3033)
    longitude = models.FloatField(default=15.3083)
    radius_km = models.FloatField(default=5.0)
    assigned_salespersons = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='assigned_plaques'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Enterprise(models.Model):
    plaque_rel = models.ForeignKey(
        Plaque,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enterprises'
    )
    name = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    approximate_size = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Plaque / Zone géographique & OpenStreetMap Geocoding
    plaque = models.CharField(max_length=100, default='Kinshasa (Gombe)', db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Données de Scraping & Profilage
    scraping_status = models.CharField(
        max_length=20,
        choices=[('PENDING', 'En attente'), ('SCRAPED', 'Scrapé'), ('FAILED', 'Échoué')],
        default='PENDING'
    )
    scraped_data = models.JSONField(default=dict, blank=True, help_text="Données brutes issues du web et réseaux sociaux")
    
    # Hypothèses & Brief Commercial générés par l'IA
    ai_hypotheses = models.JSONField(default=list, blank=True, help_text="Hypothèses commerciales pré-visite")
    ai_tailored_pitch = models.TextField(blank=True, default='', help_text="Pitch personnalisé généré par l'IA")
    ai_key_questions = models.JSONField(default=list, blank=True, help_text="Questions stratégiques préconisées")
    ai_potential_objections = models.JSONField(default=list, blank=True, help_text="Objections probables et contre-arguments")
    
    # Qualification Commerciale IA
    is_ready_for_conversion = models.BooleanField(default=True)
    conversion_score = models.IntegerField(default=85)  # 0 à 100%
    recommended_solution = models.CharField(max_length=200, blank=True, default='Fibre Optique Pro + Microsoft 365')
    
    existing_crm_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Identifiants uniques pour la France
    siren = models.CharField(max_length=9, blank=True, null=True, unique=True, verbose_name="Numéro SIREN")
    siret = models.CharField(max_length=14, blank=True, null=True, unique=True, verbose_name="Numéro SIRET")
    
    # Identifiants dans les systèmes externes (CRM et Cloud Provisioning)
    kaabu_organization_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    arrowsphere_tenant_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    # Statuts de synchronisation
    sync_status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'En attente'), ('SYNCED', 'Synchronisé'), ('ERROR', 'Erreur de synchro')],
        default='PENDING'
    )
    last_sync_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.plaque})"


class VisitPreparation(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='preparations')
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='preparations'
    )
    hypothesis_to_verify = models.TextField(blank=True, default='')
    custom_pitch = models.TextField(blank=True, default='')
    key_questions = models.TextField(blank=True, default='')
    meeting_objective = models.CharField(max_length=255, blank=True, default='')
    scheduled_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Brief: {self.enterprise.name} par {self.salesperson.username}"


class LiveVisitSession(models.Model):
    preparation = models.ForeignKey(VisitPreparation, on_delete=models.CASCADE, related_name='live_sessions')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='live_sessions')
    salesperson = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_sessions')
    session_status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Active'), ('PAUSED', 'En pause'), ('COMPLETED', 'Terminée')],
        default='ACTIVE'
    )
    live_transcript = models.TextField(blank=True, default='', help_text="Transcription incrémentale de l'échange")
    detected_needs = models.JSONField(default=list, blank=True, help_text="Besoins détectés en temps réel")
    detected_objections = models.JSONField(default=list, blank=True, help_text="Objections formulées en direct")
    live_proposition = models.JSONField(default=dict, blank=True, help_text="JSON dynamique de proposition commerciale")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session Live #{self.id} : {self.enterprise.name} ({self.session_status})"


class VisitReport(models.Model):
    preparation = models.OneToOneField(VisitPreparation, on_delete=models.CASCADE, related_name='report')
    raw_transcript = models.TextField(blank=True, default='')
    executive_summary = models.TextField(blank=True, default='')
    confirmed_needs = models.JSONField(default=list, blank=True)
    objections_raised = models.JSONField(default=list, blank=True)
    actions_todo = models.JSONField(default=list, blank=True)
    follow_up_email_draft = models.TextField(blank=True, default='')
    audio_file_path = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Boucle d'amélioration continue & Feedback vers Core AI
    original_ai_output = models.JSONField(default=dict, blank=True, help_text="Sortie brute originale fournie par Core AI")
    ai_feedback_rating = models.IntegerField(null=True, blank=True, help_text="Note attribuée par le commercial (1 à 5 étoiles)")
    ai_feedback_comments = models.TextField(blank=True, default='', help_text="Remarques et corrections apportées par l'humain")
    ai_feedback_sent_at = models.DateTimeField(null=True, blank=True, help_text="Date d'envoi du feedback au Core AI")

    def __str__(self):
        return f"Rapport: {self.preparation.enterprise.name} ({self.created_at.strftime('%d/%m/%Y')})"


class ScraperCredential(models.Model):
    PLATFORM_CHOICES = [
        ('LINKEDIN', 'LinkedIn'),
        ('TWITTER', 'Twitter / X'),
        ('TIKTOK', 'TikTok'),
        ('FACEBOOK', 'Facebook'),
    ]
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES, unique=True)
    cookies_value = models.TextField(help_text="Chaîne brute des cookies ou valeur au format JSON.")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Identifiants de Scraping : {self.get_platform_display()}"
