from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
import uuid


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events across contexts."""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def event_name(self) -> str:
        return self.__class__.__name__


class EventBus:
    """Interface for publishing domain events."""
    def publish(self, event: DomainEvent) -> None:
        raise NotImplementedError

    def publish_all(self, events: list[DomainEvent]) -> None:
        for event in events:
            self.publish(event)
