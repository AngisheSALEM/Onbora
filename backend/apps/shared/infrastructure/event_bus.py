import logging
from typing import Callable, Dict, List, Type
from shared.domain.events import DomainEvent, EventBus

logger = logging.getLogger(__name__)


class InMemoryEventBus(EventBus):
    """
    In-memory synchronous event dispatcher.
    Can be easily swapped with RabbitMQ / Kafka / Celery in microservices topology.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InMemoryEventBus, cls).__new__(cls)
            cls._instance._subscribers: Dict[Type[DomainEvent], List[Callable]] = {}
        return cls._instance

    def subscribe(self, event_type: Type[DomainEvent], handler: Callable[[DomainEvent], None]) -> None:
        """Register a handler for a given DomainEvent type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        if handler not in self._subscribers[event_type]:
            self._subscribers[event_type].append(handler)
            logger.debug(f"[EventBus] Subscribed {handler.__name__} to {event_type.__name__}")

    def publish(self, event: DomainEvent) -> None:
        """Dispatch domain event to all registered listeners."""
        event_type = type(event)
        handlers = self._subscribers.get(event_type, [])
        logger.info(f"[EventBus] Publishing {event_type.__name__} to {len(handlers)} handler(s)")
        
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"[EventBus] Error in handler {handler.__name__} for {event_type.__name__}: {e}", exc_info=True)


# Global singleton instance
default_event_bus = InMemoryEventBus()
