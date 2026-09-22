"""
PME Qualification Strategy
==========================
Segment : PME (Petites et Moyennes Entreprises, 10 à 250 postes)
Acteurs : KAM (Key Account Managers, visites terrain approfondies et suivi bureau).
Règles : Évaluation multi-sites, applications métiers, cloud, budget et détection potentiel Grand Compte.
"""

from typing import Dict, Any, List, Optional, Tuple
from .base import BaseQualificationStrategy


class PmeQualificationStrategy(BaseQualificationStrategy):
    @property
    def segment_code(self) -> str:
        return "PME"

    @property
    def segment_label(self) -> str:
        return "PME (Petites et Moyennes Entreprises)"

    def get_questions(self) -> List[Dict[str, Any]]:
        return [
            {
                "code": "pme_workstations_count",
                "label": "Nombre total de postes & collaborateurs connectés",
                "type": "NUMBER",
                "required": True,
                "is_blocking": True,
                "help_text": "Nombre d'utilisateurs actifs nécessitant ordinateurs, messagerie et accès réseau."
            },
            {
                "code": "pme_sites_count",
                "label": "Nombre de sites physiques / succursales",
                "type": "NUMBER",
                "required": True,
                "is_blocking": True,
                "help_text": "Nombre total de bureaux, entrepôts ou agences à interconnecter."
            },
            {
                "code": "pme_business_apps",
                "label": "Applications Métiers & Systèmes Critiques",
                "type": "MULTI_CHOICE",
                "required": True,
                "options": [
                    "ERP central (SAP, Sage, Odoo, Cegid)",
                    "CRM Cloud (Salesforce, Microsoft Dynamics, HubSpot)",
                    "Comptabilité & Paie décentralisée",
                    "Téléphonie IP d'entreprise (IP-PBX, Teams Phone)",
                    "Système de Gestion d'Entrepôt / WMS",
                    "Outils Collaboratifs (Microsoft 365, Google Workspace)"
                ],
                "help_text": "Logiciels indispensables au fonctionnement quotidien de l'entreprise."
            },
            {
                "code": "pme_cloud_hosting",
                "label": "Hébergement des Données & Infrastructure",
                "type": "CHOICE",
                "required": True,
                "options": [
                    "Serveurs physiques internes (On-Premise)",
                    "Cloud Public (Microsoft Azure, AWS, GCP)",
                    "Cloud Privé / Datacenter Souverain local",
                    "Environnement Hybride (Local + Cloud)",
                    "Aucun serveur (Postes autonomes uniquement)"
                ],
                "help_text": "Où sont hébergées les données et machines virtuelles."
            },
            {
                "code": "pme_telecom_budget",
                "label": "Budget Télécom & Infogérance mensuel estimé",
                "type": "NUMBER",
                "required": False,
                "unit": "EUR",
                "help_text": "Dépenses mensuelles globales (Fibre dédiée, VPN, sauvegardes, support)."
            },
            {
                "code": "pme_contract_expiration",
                "label": "Échéance des contrats fournisseurs actuels",
                "type": "CHOICE",
                "required": False,
                "options": [
                    "Inférieure à 3 mois (Imminente)",
                    "Entre 3 et 6 mois",
                    "Entre 6 et 12 mois",
                    "Supérieure à 12 mois",
                    "Sans engagement / Renouvellement tacite"
                ],
                "help_text": "Période de fin d'engagement des liaisons et contrats opérateurs en cours."
            }
        ]

    def validate_answers(self, answers: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if answers.get("pme_workstations_count") is None:
            errors.append("Le nombre de postes (pme_workstations_count) est obligatoire.")
        if answers.get("pme_sites_count") is None:
            errors.append("Le nombre de sites (pme_sites_count) est obligatoire.")
        if not answers.get("pme_business_apps"):
            errors.append("Au moins une application métier (pme_business_apps) doit être renseignée.")
        if not answers.get("pme_cloud_hosting"):
            errors.append("Le mode d'hébergement (pme_cloud_hosting) est obligatoire.")

        return len(errors) == 0, errors

    def calculate_completeness(self, answers: Dict[str, Any]) -> float:
        questions = self.get_questions()
        required_keys = [q["code"] for q in questions if q.get("required")]
        optional_keys = [q["code"] for q in questions if not q.get("required")]

        req_filled = sum(1 for k in required_keys if answers.get(k) is not None and answers.get(k) != "" and answers.get(k) != [])
        opt_filled = sum(1 for k in optional_keys if answers.get(k) is not None and answers.get(k) != "" and answers.get(k) != [])

        score = (req_filled / len(required_keys) * 0.75) if required_keys else 0.75
        if optional_keys:
            score += (opt_filled / len(optional_keys) * 0.25)

        return round(min(1.0, score), 2)

    def detect_segment_pivot(self, answers: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Règle d'aiguillage PME -> KAM (Grands Comptes) :
        - Si pme_workstations_count > 250
        - Ou si pme_sites_count > 5
        - Ou si budget télécom mensuel >= 5000 €
        """
        try:
            workstations = int(answers.get("pme_workstations_count") or 0)
        except (ValueError, TypeError):
            workstations = 0

        try:
            sites = int(answers.get("pme_sites_count") or 0)
        except (ValueError, TypeError):
            sites = 0

        try:
            budget = float(answers.get("pme_telecom_budget") or 0.0)
        except (ValueError, TypeError):
            budget = 0.0

        if workstations > 250:
            return {
                "target_segment": "KAM",
                "reason": f"Effectif supérieur au seuil PME : {workstations} postes déclarés (seuil PME <= 250). Bascule en Grand Compte requise.",
                "trigger_field": "pme_workstations_count",
                "trigger_value": workstations
            }

        if sites > 5:
            return {
                "target_segment": "KAM",
                "reason": f"Réseau multi-sites étendu ({sites} sites distants) : nécessite une gouvernance Grand Compte / MPLS / SD-WAN centralisé.",
                "trigger_field": "pme_sites_count",
                "trigger_value": sites
            }

        if budget >= 5000.0:
            return {
                "target_segment": "KAM",
                "reason": f"Budget d'infrastructure majeur ({budget:.2f} €/mois) : éligible au traitement Grand Compte.",
                "trigger_field": "pme_telecom_budget",
                "trigger_value": budget
            }

        return None
