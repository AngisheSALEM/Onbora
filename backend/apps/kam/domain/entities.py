from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional
from shared.domain.entities import AggregateRoot
from .value_objects import DossierSource, DossierStatus


@dataclass
class ProspectDossierEntity(AggregateRoot):
    source: str = DossierSource.INBOUND_CONVERSATION.value
    conversation_id: Optional[int] = None
    visit_report_id: Optional[int] = None
    kam_id: Optional[int] = None
    status: str = DossierStatus.NEW.value
    contact_name: str = ""
    phone: str = ""
    rccm: str = ""
    billing_address: str = ""
    is_complete: bool = False
    raw_conversation_data: Dict[str, Any] = field(default_factory=dict)
    internal_kam_notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
