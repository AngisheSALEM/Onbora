from django.db import models

class ServiceCatalog(models.Model):
    CONNECTIVITY = 'CONNECTIVITY'
    CLOUD = 'CLOUD'
    SECURITY = 'SECURITY'
    COLLABORATIVE = 'COLLABORATIVE'
    PAYMENT = 'PAYMENT'
    
    CATEGORY_CHOICES = [
        (CONNECTIVITY, 'Connectivité'),
        (CLOUD, 'Cloud'),
        (SECURITY, 'Cybersécurité'),
        (COLLABORATIVE, 'Collaboration / Outils collaboratifs'),
        (PAYMENT, 'Moyens de Paiement / FinTech'),
    ]
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    benefits = models.TextField()
    technical_requirements = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
