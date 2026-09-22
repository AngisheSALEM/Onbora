"""
Qualification Strategy Registry & Factory
==========================================
Fournit la stratégie de qualification appropriée en fonction du segment (SOHO, PME, KAM).
"""

from typing import Dict, Type
from .base import BaseQualificationStrategy
from .soho_strategy import SohoQualificationStrategy
from .pme_strategy import PmeQualificationStrategy
from .kam_strategy import KamQualificationStrategy

_STRATEGY_MAP: Dict[str, Type[BaseQualificationStrategy]] = {
    "SOHO": SohoQualificationStrategy,
    "TPE": SohoQualificationStrategy,  # Alias
    "PME": PmeQualificationStrategy,
    "KAM": KamQualificationStrategy,
    "GRAND_COMPTE": KamQualificationStrategy,  # Alias
}


def get_qualification_strategy(segment: str) -> BaseQualificationStrategy:
    """
    Instancie la stratégie de qualification correspondant au segment fourni.
    Par défaut, renvoie la stratégie SOHO si le segment n'est pas reconnu.
    """
    normalized = (segment or "SOHO").upper().strip()
    strategy_cls = _STRATEGY_MAP.get(normalized, SohoQualificationStrategy)
    return strategy_cls()
