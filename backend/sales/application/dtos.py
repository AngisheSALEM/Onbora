from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class EnterpriseDTO(BaseDTO):
    id: int
    name: str
    website: Optional[str] = None
    sector: Optional[str] = None
    approximate_size: Optional[str] = None
    location: Optional[str] = None
    existing_crm_data: Dict[str, Any] = field(default_factory=dict)
    siren: Optional[str] = None
    siret: Optional[str] = None
    kaabu_organization_id: Optional[str] = None
    arrowsphere_tenant_id: Optional[str] = None
    sync_status: str = "PENDING"
    last_sync_date: Optional[datetime] = None


@dataclass
class VisitPreparationDTO(BaseDTO):
    id: int
    enterprise_id: int
    salesperson_id: int
    meeting_objective: str
    hypothesis_to_verify: str
    custom_pitch: str
    key_questions: str
    scheduled_date: Optional[datetime] = None


@dataclass
class VisitReportDTO(BaseDTO):
    id: int
    preparation_id: int
    raw_transcript: str
    executive_summary: str
    confirmed_needs: List[str] = field(default_factory=list)
    objections_raised: List[str] = field(default_factory=list)
    actions_todo: List[str] = field(default_factory=list)
    follow_up_email_draft: str = ""
    audio_file_path: Optional[str] = None


@dataclass
class VoiceUploadResultDTO(BaseDTO):
    audio_file_path: str
    transcript: str
    provider: str


@dataclass
class ScraperCredentialDTO(BaseDTO):
    id: int
    platform: str
    cookies_value: str
    updated_at: Optional[datetime] = None
