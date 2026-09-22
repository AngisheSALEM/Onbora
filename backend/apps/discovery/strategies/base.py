"""
Base Qualification Strategy
===========================
Architecture : Clean Architecture / Pattern Strategy
Rôle : Contrat abstrait définissant le parcours de découverte et les règles de pivot de segment.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple


class BaseQualificationStrategy(ABC):
    """
    Interface abstraite pour la qualification commerciale selon le segment de marché.
    """

    @property
    @abstractmethod
    def segment_code(self) -> str:
        """Code normalisé du segment (SOHO, PME, KAM)."""
        pass

    @property
    @abstractmethod
    def segment_label(self) -> str:
        """Libellé explicite du segment."""
        pass

    @abstractmethod
    def get_questions(self) -> List[Dict[str, Any]]:
        """
        Retourne la liste ordonnée des questions de découverte avec leurs métadonnées
        (type, options, caractère bloquant/obligatoire).
        """
        pass

    @abstractmethod
    def validate_answers(self, answers: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Valide la complétude et la cohérence des réponses fournies.
        Retourne (is_valid, list_of_errors).
        """
        pass

    @abstractmethod
    def calculate_completeness(self, answers: Dict[str, Any]) -> float:
        """
        Calcule le score de complétude (entre 0.0 et 1.0) selon le nombre
        de questions obligatoires et optionnelles renseignées.
        """
        pass

    @abstractmethod
    def detect_segment_pivot(self, answers: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Analyse les réponses pour détecter une anomalie de dimensionnement
        justifiant une bascule immédiate vers un segment supérieur (ex: SOHO -> PME, PME -> KAM).
        
        Retourne un dictionnaire de pivot ou None si aucun pivot n'est requis :
        {
            "target_segment": "PME" | "KAM",
            "reason": "Plus de 10 postes informatiques déclarés lors d'une visite SOHO.",
            "trigger_field": "workstations_count",
            "trigger_value": 15
        }
        """
        pass
