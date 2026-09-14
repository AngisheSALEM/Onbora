from dataclasses import dataclass
from typing import Dict, Any, List
from shared.domain.entities import ValueObject


@dataclass(frozen=True)
class RecommendedServiceVO(ValueObject):
    service_id: int
    name: str
    category: str
    priority: str
    reasoning: str


@dataclass(frozen=True)
class TargetArchitectureState(ValueObject):
    current_state: List[str]
    proposed_state: List[str]
    roadmap: List[str]
