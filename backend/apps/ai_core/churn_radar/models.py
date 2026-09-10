from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ChurnRiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RetentionActionPlan(BaseModel):
    urgency: str = Field("IMMEDIATE_48H")
    action: str = Field(...)
    email_draft: str = Field(...)


class UpsellOpportunity(BaseModel):
    solution: str = Field(...)
    trigger: str = Field(...)
    estimated_value: str = Field(...)
    talking_point: str = Field(...)


class ChurnRadarInput(BaseModel):
    company_name: str
    current_services: List[str] = Field(default_factory=list)
    recent_interactions_notes: str = Field(...)
    unresolved_incidents_count: Optional[int] = 0
    contract_end_date: Optional[str] = None
    orange_catalog_context: Optional[List[str]] = Field(default_factory=list)


class ChurnRadarOutput(BaseModel):
    churn_risk_level: ChurnRiskLevel
    churn_score: int = Field(..., ge=0, le=100)
    churn_reasons: List[str] = Field(default_factory=list)
    retention_plan: RetentionActionPlan
    upsell_opportunities: List[UpsellOpportunity] = Field(default_factory=list)
