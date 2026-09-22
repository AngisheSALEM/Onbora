"""
SOHO Qualification Strategy
===========================
Segment : SOHO (TPE / Petits commerces / Indépendants)
Acteurs : Prospecteurs / Prestataires terrain (visite rapide, mobile offline-first).
Règles : 3 questions bloquantes + détection précoce du potentiel PME.
"""

from typing import Dict, Any, List, Optional, Tuple
from .base import BaseQualificationStrategy


class SohoQualificationStrategy(BaseQualificationStrategy):
    @property
    def segment_code(self) -> str:
        return "SOHO"

    @property
    def segment_label(self) -> str:
        return "SOHO / TPE (Très Petites Entreprises)"

    def get_questions(self) -> List[Dict[str, Any]]:
        return [
            {
                "code": "soho_activity",
                "label": "Activité & Métier",
                "type": "CHOICE",
                "required": True,
                "is_blocking": True,
                "options": [
                    "Commerce de détail & Boutique",
                    "Restauration & Bar / Hôtellerie",
                    "Artisanat & Bâtiment",
                    "Cabinet Médical / Paramédical",
                    "Services & Conseil",
                    "Autre Activité"
                ],
                "help_text": "Secteur d'activité principal de l'établissement."
            },
            {
                "code": "soho_eligibility",
                "label": "Éligibilité & Connectivité Actuelle",
                "type": "CHOICE",
                "required": True,
                "is_blocking": True,
                "options": [
                    "Fibre optique existante / Raccordée",
                    "Fibre optique éligible (Non raccordée)",
                    "Connexion 4G / 5G Box uniquement",
                    "Liaison ADSL / Cuivre instable",
                    "Zone blanche / Non éligible fibre"
                ],
                "help_text": "Type de liaison internet disponible à l'adresse."
            },
            {
                "code": "soho_decider_present",
                "label": "Présence du Décideur / Gérant",
                "type": "BOOLEAN",
                "required": True,
                "is_blocking": True,
                "help_text": "Le propriétaire, gérant ou signataire est-il présent sur place ?"
            },
            {
                "code": "workstations_count",
                "label": "Nombre de postes informatiques & terminaux",
                "type": "NUMBER",
                "required": False,
                "default": 2,
                "help_text": "Nombre total d'ordinateurs, caisses connectées et postes de travail."
            },
            {
                "code": "multisite",
                "label": "Établissement multi-sites",
                "type": "BOOLEAN",
                "required": False,
                "default": False,
                "help_text": "L'entreprise dispose-t-elle de dépôts ou points de vente secondaires ?"
            },
            {
                "code": "estimated_monthly_telecom_spend",
                "label": "Budget télécom mensuel estimé",
                "type": "NUMBER",
                "required": False,
                "unit": "EUR",
                "help_text": "Montant mensuel approximatif dépensé en abonnements internet et mobiles."
            }
        ]

    def validate_answers(self, answers: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not answers.get("soho_activity"):
            errors.append("Le secteur d'activité (soho_activity) est obligatoire.")
        if not answers.get("soho_eligibility"):
            errors.append("Le statut d'éligibilité réseau (soho_eligibility) est obligatoire.")
        if answers.get("soho_decider_present") is None:
            errors.append("L'indication de présence du décideur (soho_decider_present) est obligatoire.")

        return len(errors) == 0, errors

    def calculate_completeness(self, answers: Dict[str, Any]) -> float:
        questions = self.get_questions()
        required_keys = [q["code"] for q in questions if q.get("required")]
        optional_keys = [q["code"] for q in questions if not q.get("required")]

        req_filled = sum(1 for k in required_keys if answers.get(k) is not None and answers.get(k) != "")
        opt_filled = sum(1 for k in optional_keys if answers.get(k) is not None and answers.get(k) != "")

        # 70% pour les obligatoires, 30% pour les optionnelles
        score = (req_filled / len(required_keys) * 0.70) if required_keys else 0.70
        if optional_keys:
            score += (opt_filled / len(optional_keys) * 0.30)

        return round(min(1.0, score), 2)

    def detect_segment_pivot(self, answers: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Option A (Gouvernance Réaliste & Sans Friction) :
        Le segment SOHO / TPE est géré de bout en bout de manière autonome par le commercial
        terrain ou le prestataire de service.
        Zéro bascule artificielle de complexité : une TPE reste 100% SOHO sans handoff KAM.
        """
        return None
