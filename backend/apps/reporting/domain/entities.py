from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional
from shared.domain.entities import AggregateRoot


@dataclass
class DemoEventEntity(AggregateRoot):
    event_type: str = ""
    description: str = ""
    user_id: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
