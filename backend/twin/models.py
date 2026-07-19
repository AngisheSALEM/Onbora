from django.db import models
from kam.models import ProspectDossier

class BusinessTwin(models.Model):
    prospect_dossier = models.OneToOneField(
        ProspectDossier,
        on_delete=models.CASCADE,
        related_name='business_twin'
    )
    current_state = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des problèmes identifiés et outils actuels (état initial)"
    )
    proposed_state = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des solutions apportées et bénéfices attendus (état cible)"
    )
    recommended_services = models.JSONField(
        default=list,
        blank=True,
        help_text="Détail des services recommandés du catalogue MSP avec justifications"
    )
    roadmap = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste ordonnée d'étapes de déploiement simulé"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Business Twin #{self.id} for Dossier #{self.prospect_dossier.id}"
