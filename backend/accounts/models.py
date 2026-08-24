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
    ADMIN = 'ADMIN'
    
    ROLE_CHOICES = [
        (CLIENT_B2B, 'Client B2B'),
        (SALESPERSON, 'Prospecteur / Commercial'),
        (KAM, 'Key Account Manager'),
        (SUPERVISOR, 'Superviseur / Gestionnaire Back-office'),
        (ADMIN, 'Administrateur MSP'),
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

