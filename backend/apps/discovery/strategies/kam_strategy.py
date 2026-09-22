"""
KAM (Grands Comptes) Qualification Strategy
===========================================
Segment : KAM / Grands Comptes (> 250 postes ou groupes multi-sites majeurs)
Acteurs : KAM Senior, Directeurs de Comptes Stratégiques.
Règles : Gouvernance matricielle, architecture IT complexe, processus d'appels d'offres et cartographie décisionnelle.
"""

from typing import Dict, Any, List, Optional, Tuple
from .base import BaseQualificationStrategy


class KamQualificationStrategy(BaseQualificationStrategy):
    @property
    def segment_code(self) -> str:
        return "KAM"

    @property
    def segment_label(self) -> str:
        return "Grand Compte & Compte Stratégique"

    def get_questions(self) -> List[Dict[str, Any]]:
        return [
            {
                "code": "kam_governance_structure",
                "label": "Processus Décisionnel & Gouvernance des Achats",
                "type": "CHOICE",
                "required": True,
                "is_blocking": True,
                "options": [
                    "Comité de Direction (DG + DAF + DSI)",
                    "Direction des Achats Groupe Centralisée",
                    "Appel d'Offres Formel (RFP / RFI public ou privé)",
                    "Décision filiale locale avec validation siège",
                    "Direction Technique / DSI autonome"
                ],
                "help_text": "Circuit de validation et signatures requises pour l'engagement."
            },
            {
                "code": "kam_it_architecture",
                "label": "Architecture Réseau & Données Groupe",
                "type": "MULTI_CHOICE",
                "required": True,
                "options": [
                    "Réseau étendu SD-WAN / MPLS multi-opérateurs",
                    "Datacenter privé / Baies hébergées en colocation",
                    "Infrastructure Multi-Cloud (Azure + AWS + On-Prem)",
                    "Architecture Sécurité avancée (SOC, SIEM, EDR managé)",
                    "Liaisons sécurisées inter-pays / International",
                    "Plan de Reprise d'Activité (PRA) / PCA certifié ISO 27001"
                ],
                "help_text": "Complexité de l'infrastructure informatique et exigences de conformité."
            },
            {
                "code": "kam_contractual_deadlines",
                "label": "Échéances Contractuelles & Périodes de Préavis",
                "type": "TEXT",
                "required": True,
                "help_text": "Dates d'échéances des accords-cadres en cours et délais de dénonciation contractuelle."
            },
            {
                "code": "kam_current_msp_eval",
                "label": "Évaluation du Fournisseur / Opérateur en Place",
                "type": "CHOICE",
                "required": False,
                "options": [
                    "Insatisfaction critique (Pannes récurrentes, SLA non respecté)",
                    "Support lent ou impersonnel",
                    "Tarifs trop élevés / Renégociation souhaitée",
                    "Fin de contrat naturelle sans litige majeur",
                    "Fournisseur historique très solidement implanté"
                ],
                "help_text": "Niveau de vulnérabilité du fournisseur concurrent actuel."
            },
            {
                "code": "kam_annual_it_budget",
                "label": "Enveloppe Budgétaire IT & Télécom Annuelle",
                "type": "NUMBER",
                "required": False,
                "unit": "EUR",
                "help_text": "Budget annuel prévisionnel (matériel, connectivité, licences, infogérance)."
            }
        ]

    def validate_answers(self, answers: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not answers.get("kam_governance_structure"):
            errors.append("La structure de gouvernance des achats (kam_governance_structure) est obligatoire.")
        if not answers.get("kam_it_architecture"):
            errors.append("Au moins un composant d'architecture réseau (kam_it_architecture) doit être sélectionné.")
        if not answers.get("kam_contractual_deadlines"):
            errors.append("Les échéances contractuelles (kam_contractual_deadlines) sont obligatoires.")

        return len(errors) == 0, errors

    def calculate_completeness(self, answers: Dict[str, Any]) -> float:
        questions = self.get_questions()
        required_keys = [q["code"] for q in questions if q.get("required")]
        optional_keys = [q["code"] for q in questions if not q.get("required")]

        req_filled = sum(1 for k in required_keys if answers.get(k) is not None and answers.get(k) != "" and answers.get(k) != [])
        opt_filled = sum(1 for k in optional_keys if answers.get(k) is not None and answers.get(k) != "" and answers.get(k) != [])

        score = (req_filled / len(required_keys) * 0.70) if required_keys else 0.70
        if optional_keys:
            score += (opt_filled / len(optional_keys) * 0.30)

        return round(min(1.0, score), 2)

    def detect_segment_pivot(self, answers: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Le segment KAM est le niveau le plus élevé de la segmentation Onbora.
        Aucun pivot montant supplémentaire n'est défini.
        """
        return None
