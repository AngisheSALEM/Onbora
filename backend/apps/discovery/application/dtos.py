from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class ConversationMessageDTO(BaseDTO):
    id: int
    sender: str
    content: str
    created_at: Optional[datetime] = None


@dataclass
class ClientConversationDTO(BaseDTO):
    id: int
    status: str
    channel: str
    extracted_profile: Dict[str, Any] = field(default_factory=dict)
    messages: List[ConversationMessageDTO] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class SendMessageResponseDTO(BaseDTO):
    ai_message: str
    extracted_profile: Dict[str, Any]
    is_qualified: bool
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    business_twin: Optional[Dict[str, Any]] = None
    message_id: Optional[int] = None


@dataclass
class TransmitConversationDTO(BaseDTO):
    contact_name: str = ""
    phone: str = ""
    rccm: str = ""
    billing_address: str = ""
    only_save: bool = False
