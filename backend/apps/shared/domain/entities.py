from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional, Dict
import uuid


@dataclass
class Entity:
    """Base class for Domain Entities with unique identity."""
    id: Optional[Any] = None

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return False
        if self.id is None or other.id is None:
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash((self.__class__.__name__, self.id))


@dataclass(frozen=True)
class ValueObject:
    """Base class for immutable Value Objects defined by their attributes."""
    pass


@dataclass
class AggregateRoot(Entity):
    """
    Base class for Aggregate Roots.
    Maintains domain events occurred during domain operations.
    """
    _domain_events: list = field(default_factory=list, init=False, repr=False)

    def add_domain_event(self, event: Any) -> None:
        self._domain_events.append(event)

    def pull_domain_events(self) -> list:
        events = list(self._domain_events)
        self._domain_events.clear()
        return events
