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


class OfferQuestionnaire(models.Model):
    service = models.ForeignKey(ServiceCatalog, on_delete=models.CASCADE, related_name='questionnaires', null=True, blank=True)
    title = models.CharField(max_length=200, help_text="Titre du formulaire (ex: Questionnaire Qualification Fibre Pro)")
    description = models.TextField(blank=True, default='', help_text="Description ou consignes pour le commercial")
    target_offer_name = models.CharField(max_length=150, blank=True, default='', help_text="Nom de l'offre ciblée")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class OfferQuestion(models.Model):
    QUESTION_TYPES = [
        ('SINGLE_CHOICE', 'Choix Unique (Boutons Radio)'),
        ('MULTIPLE_CHOICE', 'Choix Multiples (Cases à cocher)'),
        ('BOOLEAN', 'Oui / Non'),
        ('TEXT', 'Texte Libre Court'),
        ('NUMBER', 'Nombre / Montant numérique'),
    ]

    questionnaire = models.ForeignKey(OfferQuestionnaire, on_delete=models.CASCADE, related_name='questions')
    question_text = models.CharField(max_length=300, help_text="Libellé de la question")
    question_type = models.CharField(max_length=30, choices=QUESTION_TYPES, default='SINGLE_CHOICE')
    options = models.JSONField(default=list, blank=True, help_text="Liste des choix possibles (ex: ['1 à 5', '6 à 20', '20+'])")
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=1, help_text="Ordre d'affichage de la question")
    help_text = models.CharField(max_length=255, blank=True, default='', help_text="Indication d'aide pour le commercial terrain")
    scoring_weight = models.PositiveIntegerField(default=10, help_text="Poids de la question dans le calcul du score de qualification")

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"[{self.order}] {self.question_text}"
