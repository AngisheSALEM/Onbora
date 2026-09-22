from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SourceReference(BaseModel):
    evidence_id: int
    title: str = ""
    url: str = ""
    publisher: str = ""


class SourcedStatement(BaseModel):
    text: str
    sources: List[SourceReference] = Field(default_factory=list)


class AISummary(BaseModel):
    status: str = "complete"
    model: str = "gemini-2.5-pro"
    overview: SourcedStatement
    key_facts: List[SourcedStatement] = Field(default_factory=list)
    contradictions: List[SourcedStatement] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)


class OfferRecommendation(BaseModel):
    service_id: str
    name: str
    category: str
    description: str
    rdc_availability: str = "available"
    market: str = "RDC"


class JourneySignal(BaseModel):
    label: str
    sources: List[SourceReference] = Field(default_factory=list)


class LeadJourney(BaseModel):
    journey_id: str
    title: str
    description: str
    verdict: str = "prioritaire"
    verdict_label: str = "Prioritaire"
    confidence: str = "élevée"
    reason: str
    signals: List[JourneySignal] = Field(default_factory=list)
    offers: List[OfferRecommendation] = Field(default_factory=list)
    next_question: str
    missing_information: str
    next_action: str = ""
    sources: List[SourceReference] = Field(default_factory=list)

    @field_validator("signals", mode="before")
    @classmethod
    def _coerce_signals(cls, v: Any) -> list:
        if not isinstance(v, list):
            return []
        coerced = []
        for item in v:
            if isinstance(item, str):
                coerced.append({"label": item, "sources": []})
            elif isinstance(item, dict):
                coerced.append(item)
            elif isinstance(item, JourneySignal):
                coerced.append(item)
        return coerced


class LeadQualification(BaseModel):
    status: str = "complete"
    catalog_version: str = "orange-rdc-2026-v2"
    journeys: List[LeadJourney] = Field(default_factory=list)


class SectorPrimary(BaseModel):
    label: str
    confidence: str = "élevée"
    reason: str = ""
    sources: List[SourceReference] = Field(default_factory=list)


class SectorSegmentation(BaseModel):
    taxonomy_version: str = "v2.1"
    status: str = "complete"
    primary: SectorPrimary
    raw_activity: str = ""
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)


class EvidenceItem(BaseModel):
    evidence_id: int
    url: str
    title: str = ""
    publisher: str = ""
    source_type: str = "registry"
    relationship: str = "official"
    access_status: str = "accessible"
    relevance_score: int = 10
    verdict: str = "Pertinente"
    reasons: List[str] = Field(default_factory=list)
    relevant_excerpt: str = ""
    collected_at: str = ""


class DiscoveredSource(BaseModel):
    url: str
    title: str = ""
    snippet: str = ""
    category: str = "registry"
    query: str = ""
    provider: str = "searxng"
    discovery_score: int = 10


class DiscoverySummary(BaseModel):
    query_count: int = 0
    returned_count: int = 0
    unique_count: int = 0
    analyzed_count: int = 0
    captured_count: int = 0
    verdict_counts: Dict[str, int] = Field(default_factory=dict)
    ai_search_attempted: bool = True
    ai_search_source_count: int = 0


class CompanyInfo(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    rccm: Optional[str] = None
    dossier_number: Optional[str] = None
    province: Optional[str] = "Kinshasa"
    activity_arsp: Optional[str] = None

    @field_validator("legal_name", "trade_name", "rccm", "dossier_number", "province", "activity_arsp", mode="before")
    @classmethod
    def _coerce_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)


class CompanyBriefOutput(BaseModel):
    run_id: int = 1
    state: str = "reviewed"
    coverage: str = "complete"
    limitations: List[str] = Field(default_factory=list)
    identity_status: str = "confirmed"
    company: CompanyInfo
    summary: DiscoverySummary
    sector_segmentation: SectorSegmentation
    lead_qualification: LeadQualification
    ai_summary: AISummary
    evidence: List[EvidenceItem] = Field(default_factory=list)
    sources: List[DiscoveredSource] = Field(default_factory=list)
    created_at: str = ""
    completed_at: str = ""
