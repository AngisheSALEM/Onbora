from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.domain.entities import AggregateRoot


@dataclass
class BusinessTwinEntity(AggregateRoot):
    prospect_dossier_id: int = 0
    current_state: List[str] = field(default_factory=list)
    proposed_state: List[str] = field(default_factory=list)
    recommended_services: List[Dict[str, Any]] = field(default_factory=list)
    roadmap: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
