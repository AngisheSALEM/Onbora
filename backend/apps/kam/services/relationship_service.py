"""
Relationship Coverage & Multi-Threading Service
================================================
Domaine : KAM (PME & Grands Comptes)
Rôle : Évaluation de la profondeur relationnelle, détection proactive
du risque de mono-champion et traçabilité des preuves d'interaction.
"""

from typing import Dict, Any, List
from django.utils import timezone
from datetime import timedelta
from sales.models import Enterprise
from kam.models import RelationshipCoverage


class RelationshipCoverageService:
    @staticmethod
    def evaluate_account_relationship_coverage(enterprise_id: int) -> Dict[str, Any]:
        """
        Évalue la couverture relationnelle d'un compte PME ou Grand Compte :
        - Compte le nombre de rôles clés couverts (Acheteur Économique, Décideur Tech, Champion).
        - Détecte l'anti-pattern de vente complexe 'Mono-Champion' (un seul sponsor sans décideur économique).
        - Identifie les rôles critiques manquants pour guider le KAM.
        """
        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return {"error": f"Entreprise #{enterprise_id} introuvable"}

        # Optimisation ORM : select_related pour éviter les requêtes N+1
        contacts = list(
            RelationshipCoverage.objects.filter(enterprise=enterprise)
            .select_related('enterprise', 'last_interaction_proof')
        )

        total_contacts = len(contacts)
        champions: List[RelationshipCoverage] = []
        economic_buyers: List[RelationshipCoverage] = []
        tech_deciders: List[RelationshipCoverage] = []
        detractors: List[RelationshipCoverage] = []

        now = timezone.now()
        recent_threshold = now - timedelta(days=60)

        for c in contacts:
            if c.role_classification == 'CHAMPION':
                champions.append(c)
            elif c.role_classification == 'ECONOMIC_BUYER':
                economic_buyers.append(c)
            elif c.role_classification == 'TECH_DECIDER':
                tech_deciders.append(c)
            elif c.role_classification == 'DETRACTOR':
                detractors.append(c)

        # Critère d'évaluation Mono-Champion :
        # Un seul champion interne déclaré sans aucun acheteur économique couvert récemment
        is_mono_champion = len(champions) == 1 and len(economic_buyers) == 0

        # Mise à jour idempotente des statuts sur les contacts
        for c in contacts:
            needs_save = False
            if c.role_classification == 'CHAMPION' and is_mono_champion:
                if not c.is_mono_champion_risk or c.coverage_status != 'SINGLE_POINT_OF_FAILURE':
                    c.is_mono_champion_risk = True
                    c.coverage_status = 'SINGLE_POINT_OF_FAILURE'
                    needs_save = True
            elif c.is_mono_champion_risk:
                c.is_mono_champion_risk = False
                c.coverage_status = 'COVERED' if (c.last_interaction_at and c.last_interaction_at >= recent_threshold) else 'MISSING'
                needs_save = True

            if needs_save:
                c.save(update_fields=['is_mono_champion_risk', 'coverage_status', 'updated_at'])

        # Détection des rôles manquants
        missing_roles = []
        if not economic_buyers:
            missing_roles.append("Acheteur Économique (DG, DAF)")
        if not tech_deciders:
            missing_roles.append("Décideur Technique (DSI, Responsable IT)")
        if not champions:
            missing_roles.append("Champion Opérationnel")

        multi_threading_score = min(100, int((len(economic_buyers) * 40) + (len(tech_deciders) * 30) + (len(champions) * 30)))

        return {
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "segment": enterprise.segment,
            "total_stakeholders": total_contacts,
            "champions_count": len(champions),
            "economic_buyers_count": len(economic_buyers),
            "tech_deciders_count": len(tech_deciders),
            "detractors_count": len(detractors),
            "is_mono_champion_risk": is_mono_champion,
            "multi_threading_score": multi_threading_score,
            "missing_critical_roles": missing_roles,
            "recommended_action": (
                "Alerte Mono-Champion : Solliciter un rendez-vous avec le Directeur Général ou DAF avant la phase de négociation."
                if is_mono_champion
                else "Couverture relationnelle saine : Poursuivre le multi-threading avec les équipes techniques et métiers."
            )
        }
