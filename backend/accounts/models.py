from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    CLIENT_B2B = 'CLIENT_B2B'
    SALESPERSON = 'SALESPERSON'
    KAM = 'KAM'
    SUPERVISOR = 'SUPERVISOR'
    KAM_MANAGER = 'KAM_MANAGER'
    ADMIN = 'ADMIN'
    
    ROLE_CHOICES = [
        (CLIENT_B2B, 'Client B2B'),
        (SALESPERSON, 'Commercial Terrain'),
        (KAM, 'Key Account Manager'),
        (SUPERVISOR, 'Superviseur Back-Office Terrain'),
        (KAM_MANAGER, 'Gérant KAM Office / Grands Comptes'),
        (ADMIN, 'Administrateur Onbora MSP'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=CLIENT_B2B
    )
    phone = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True, help_text="Ville / Région d'affectation")
    is_available = models.BooleanField(default=True, help_text="Disponibilité immédiate pour affectation")
    kam_specialization = models.CharField(
        max_length=20,
        choices=[('GRAND_COMPTE', 'Grands Comptes (> 1M$)'), ('PME', 'PME (100k$ - 1M$)')],
        default='GRAND_COMPTE',
        blank=True,
        null=True,
        help_text="Segmentation du KAM dans le KAM Office"
    )
    avatar = models.CharField(max_length=255, blank=True, default='memoji_056.png', help_text="Nom du fichier memoji choisi")
    fcm_token = models.TextField(blank=True, null=True, help_text="Jeton FCM de l'appareil principal")

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    fcm_token = models.TextField(unique=True)
    device_type = models.CharField(
        max_length=20,
        default='android',
        choices=[('android', 'Android'), ('ios', 'iOS'), ('web', 'Web')]
    )
    device_name = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.device_type} ({self.fcm_token[:15]}...)"


import uuid

class UserAIAssistant(models.Model):
    """
    Instance dédiée d'assistant IA personnalisée pour chaque compte utilisateur.
    Chaque profil dispose de son assistant identifié par un UUID propre,
    d'un nom personnalisable par l'utilisateur, d'un historique de sessions,
    d'un contexte métier et d'une liste stricte d'actions autorisées selon son rôle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_assistant')
    name = models.CharField(max_length=100, default='Copilote Onbora B2B', help_text="Nom personnalisé donné à l'assistant par l'utilisateur")
    role_scope = models.CharField(max_length=30, default=User.KAM, help_text="Périmètre de rôle autorisé")
    allowed_actions = models.JSONField(default=list, blank=True, help_text="Actions automatisables autorisées selon le rôle")
    system_prompt = models.TextField(blank=True, default='', help_text="Contexte métier et règles de fonctionnement du copilote")
    custom_context = models.JSONField(default=dict, blank=True, help_text="Mémoire contextuelle et préférences persistantes")
    avatar = models.CharField(max_length=100, default='bot', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (UUID: {self.id}) - User: {self.user.username} [{self.role_scope}]"


class AIAssistantConversation(models.Model):
    """
    Sessions de dialogue conversationnel avec l'assistant IA du compte.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assistant = models.ForeignKey(UserAIAssistant, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=255, default='Nouvelle session')
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Session #{str(self.id)[:8]} - {self.title}"


class AIAssistantMessage(models.Model):
    """
    Messages échangés dans une session avec l'assistant, incluant les actions déclenchées.
    """
    ROLE_CHOICES = [
        ('user', 'Utilisateur'),
        ('assistant', 'Copilote IA'),
        ('system', 'Système'),
    ]
    ACTION_STATUS_CHOICES = [
        ('NONE', 'Aucune action'),
        ('PROPOSED', 'Action proposée'),
        ('EXECUTED', 'Action exécutée'),
        ('FAILED', 'Échec action'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(AIAssistantConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField(help_text="Texte du message ou de la réponse")
    action_type = models.CharField(max_length=60, blank=True, null=True, help_text="Type d'action métier détectée ou exécutée")
    action_payload = models.JSONField(default=dict, blank=True, help_text="Données d'entrée ou paramètres de l'action")
    action_result = models.JSONField(default=dict, blank=True, help_text="Résultat structuré retourné par l'action")
    action_status = models.CharField(max_length=20, choices=ACTION_STATUS_CHOICES, default='NONE')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}... ({self.action_type or 'no-action'})"

