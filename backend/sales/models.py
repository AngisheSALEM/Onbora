from django.db import models
from django.conf import settings

class Enterprise(models.Model):
    name = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    approximate_size = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    existing_crm_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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
