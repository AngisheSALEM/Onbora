from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.domain.entities import AggregateRoot, Entity
from .value_objects import SyncStatus, PlatformChoice


@dataclass
class PlaqueEntity(AggregateRoot):
    code: str = ""
    name: str = ""
    city: str = "Kinshasa"
    latitude: float = -4.3033
    longitude: float = 15.3083
    radius_km: float = 5.0
    assigned_salespersons_ids: List[int] = field(default_factory=list)
    total_leads_count: int = 0
    ready_leads_count: int = 0
    is_active: bool = True


@dataclass
class EnterpriseEntity(AggregateRoot):
    plaque_id: Optional[int] = None
    name: str = ""
    website: Optional[str] = None
    sector: Optional[str] = None
    approximate_size: Optional[str] = None
    location: Optional[str] = None
    plaque: str = "Kinshasa (Gombe)"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Scraping & AI Hypotheses
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
class LiveVisitSessionEntity(AggregateRoot):
    preparation_id: int = 0
    enterprise_id: int = 0
    salesperson_id: int = 0
    session_status: str = "ACTIVE"
    live_transcript: str = ""
    detected_needs: List[str] = field(default_factory=list)
    detected_objections: List[str] = field(default_factory=list)
    live_proposition: Dict[str, Any] = field(default_factory=dict)


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
    original_ai_output: Dict[str, Any] = field(default_factory=dict)
    ai_feedback_rating: Optional[int] = None
    ai_feedback_comments: str = ""
    ai_feedback_sent_at: Optional[datetime] = None


@dataclass
class ScraperCredentialEntity(Entity):
    platform: str = PlatformChoice.LINKEDIN.value
    cookies_value: str = ""

