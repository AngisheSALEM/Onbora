from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class BusinessTwinDTO(BaseDTO):
    id: int
    prospect_dossier_id: int
    current_state: List[str] = field(default_factory=list)
    proposed_state: List[str] = field(default_factory=list)
    recommended_services: List[Dict[str, Any]] = field(default_factory=list)
    roadmap: List[str] = field(default_factory=list)
