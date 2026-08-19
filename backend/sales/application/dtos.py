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
    plaque: str = "Kinshasa (Gombe)"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_ready_for_conversion: bool = True
    conversion_score: int = 85
    recommended_solution: str = "Fibre Optique Pro + Microsoft 365"
    existing_crm_data: Dict[str, Any] = field(default_factory=dict)
    siren: Optional[str] = None
    siret: Optional[str] = None
    kaabu_organization_id: Optional[str] = None
    arrowsphere_tenant_id: Optional[str] = None
    sync_status: str = "PENDING"
    last_sync_date: Optional[datetime] = None


@dataclass
class EnterpriseMapDTO(BaseDTO):
    id: int
    name: str
    sector: str
    approximate_size: str
    location: str
    plaque: str
    latitude: float
    longitude: float
    is_ready_for_conversion: bool
    conversion_score: int
    recommended_solution: str
    existing_crm_status: str = "PROSPECT"


@dataclass
class EnterpriseBriefDTO(BaseDTO):
    enterprise_id: int
    enterprise_name: str
    sector: str
    approximate_size: str
    location: str
    plaque: str
    conversion_score: int
    recommended_solution: str
    meeting_objective: str
    hypothesis_to_verify: str
    custom_pitch: str
    key_questions: str
    recommended_catalog_services: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class PlaqueDTO(BaseDTO):
    name: str
    display_name: str
    total_enterprises: int
    ready_count: int
    center_latitude: float
    center_longitude: float


@dataclass
class SalespersonActivityDTO(BaseDTO):
    active_meetings: List[Dict[str, Any]] = field(default_factory=list)
    recent_reports: List[Dict[str, Any]] = field(default_factory=list)
    total_visits_count: int = 0
    total_transmitted_count: int = 0
    conversion_rate: float = 0.0


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
