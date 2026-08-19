from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.domain.entities import AggregateRoot, Entity
from .value_objects import SyncStatus, PlatformChoice


@dataclass
class EnterpriseEntity(AggregateRoot):
    name: str = ""
    website: Optional[str] = None
    sector: Optional[str] = None
    approximate_size: Optional[str] = None
    location: Optional[str] = None
    existing_crm_data: Dict[str, Any] = field(default_factory=dict)
    siren: Optional[str] = None
    siret: Optional[str] = None
    kaabu_organization_id: Optional[str] = None
    arrowsphere_tenant_id: Optional[str] = None
    sync_status: str = SyncStatus.PENDING.value
    last_sync_date: Optional[datetime] = None


@dataclass
class VisitPreparationEntity(AggregateRoot):
    enterprise_id: int = 0
    salesperson_id: int = 0
    hypothesis_to_verify: str = ""
    custom_pitch: str = ""
    key_questions: str = ""
    meeting_objective: str = ""
    scheduled_date: Optional[datetime] = None


@dataclass
class VisitReportEntity(AggregateRoot):
    preparation_id: int = 0
    raw_transcript: str = ""
    executive_summary: str = ""
    confirmed_needs: List[str] = field(default_factory=list)
    objections_raised: List[str] = field(default_factory=list)
    actions_todo: List[str] = field(default_factory=list)
    follow_up_email_draft: str = ""
    audio_file_path: Optional[str] = None


@dataclass
class ScraperCredentialEntity(Entity):
    platform: str = PlatformChoice.LINKEDIN.value
    cookies_value: str = ""
