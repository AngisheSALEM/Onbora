from django.db import models
from django.conf import settings


class Enterprise(models.Model):
    name = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    approximate_size = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Plaque / Zone géographique & OpenStreetMap Geocoding
    plaque = models.CharField(max_length=100, default='Kinshasa (Gombe)', db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
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
