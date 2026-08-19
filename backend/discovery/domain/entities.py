from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.domain.entities import AggregateRoot, Entity
from .value_objects import ConversationStatus, ConversationChannel, MessageSender


@dataclass
class ConversationMessageEntity(Entity):
    conversation_id: int = 0
    sender: str = MessageSender.AI.value
    content: str = ""
    created_at: Optional[datetime] = None


@dataclass
class ClientConversationEntity(AggregateRoot):
    client_id: Optional[int] = None
    status: str = ConversationStatus.ACTIVE.value
    channel: str = ConversationChannel.PORTAL.value
    extracted_profile: Dict[str, Any] = field(default_factory=dict)
    messages: List[ConversationMessageEntity] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
