from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class ProspectDossierDTO(BaseDTO):
    id: int
    source: str
    status: str
    contact_name: str = ""
    phone: str = ""
    rccm: str = ""
    billing_address: str = ""
    is_complete: bool = False
    raw_conversation_data: Dict[str, Any] = field(default_factory=dict)
    internal_kam_notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ProvisionRequestDTO(BaseDTO):
    service: str
    action: str = 'start'  # 'start' or 'complete'
