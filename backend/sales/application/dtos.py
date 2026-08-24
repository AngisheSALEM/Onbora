from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class PlaqueDTO(BaseDTO):
    id: int
    code: str
    name: str
    city: str
    latitude: float
    longitude: float
    radius_km: float
    total_enterprises: int = 0
    ready_count: int = 0
    assigned_salespersons: List[int] = field(default_factory=list)
    assigned_salespersons_names: List[str] = field(default_factory=list)
    boundary_geojson: Dict[str, Any] = field(default_factory=dict)
    kml_data: Optional[str] = None
    kml_url: Optional[str] = None
    is_active: bool = True
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    created_at: Optional[datetime] = None


@dataclass
class EnterpriseDTO(BaseDTO):
    id: int
    name: str
    website: Optional[str] = None
    sector: Optional[str] = None
    approximate_size: Optional[str] = None
    location: Optional[str] = None
    plaque: str = "Kinshasa (Gombe)"
    plaque_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scraping_status: str = "PENDING"
    scraped_data: Dict[str, Any] = field(default_factory=dict)
    ai_hypotheses: List[str] = field(default_factory=list)
    ai_tailored_pitch: str = ""
    ai_key_questions: List[str] = field(default_factory=list)
    ai_potential_objections: List[str] = field(default_factory=list)
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
class PlaqueDetailDTO(BaseDTO):
    id: int
    code: str
    name: str
    city: str
    center_latitude: float
    center_longitude: float
    radius_km: float
    total_enterprises: int
    ready_count: int
    assigned_salespersons: List[Dict[str, Any]] = field(default_factory=list)
    leads: List[EnterpriseDTO] = field(default_factory=list)


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
    ai_hypotheses: List[str] = field(default_factory=list)
    ai_potential_objections: List[str] = field(default_factory=list)
    recommended_catalog_services: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SalespersonActivityDTO(BaseDTO):
    active_meetings: List[Dict[str, Any]] = field(default_factory=list)
    recent_reports: List[Dict[str, Any]] = field(default_factory=list)
    total_visits_count: int = 0
    total_transmitted_count: int = 0
    conversion_rate: float = 0.0


@dataclass
class LiveCopilotTurnDTO(BaseDTO):
    session_id: int
    enterprise_id: int
    enterprise_name: str
    active_sentiment: str
    detected_needs: List[str]
    detected_objections: List[str]
    realtime_proposition: Dict[str, Any]


@dataclass
class PostVisitReportResultDTO(BaseDTO):
    report_id: int
    dossier_id: int
    enterprise_name: str
    executive_summary: str
    confirmed_needs: List[str]
    objections_raised: List[str]
    actions_todo: List[str]
    follow_up_email_draft: str
    status: str = "TRANSMITTED_TO_KAM"


@dataclass
class CoreAIFeedbackDTO(BaseDTO):
    report_id: int
    rating: int
    comments: str
    status: str
    submitted_at: str


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
    ai_feedback_rating: Optional[int] = None
    ai_feedback_comments: str = ""


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

