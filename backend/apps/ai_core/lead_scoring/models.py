from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ScoringTier(str, Enum):
    TIER_1_PRIORITY = "TIER_1_PRIORITY"
    TIER_2_MEDIUM = "TIER_2_MEDIUM"
    TIER_3_NURTURING = "TIER_3_NURTURING"


class ConversionProbability(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class DriverType(str, Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"


class ScoreDriver(BaseModel):
    factor: str
    impact: str
    type: DriverType


class LeadScoringInput(BaseModel):
    company_name: str
    sector: Optional[str] = "Services"
    locations_count: Optional[int] = 1
    budget_status: Optional[str] = "Non précisé"
    pain_level: Optional[str] = "Modéré"
    competitor_contract_expiry: Optional[str] = "Inconnu"
    decision_maker_involved: Optional[bool] = False
    raw_notes: Optional[str] = ""
    orange_catalog_context: Optional[List[str]] = Field(default_factory=list)


class LeadScoringOutput(BaseModel):
    lead_score: int = Field(..., ge=0, le=100)
    scoring_tier: ScoringTier
    conversion_probability: ConversionProbability
    score_drivers: List[ScoreDriver] = Field(default_factory=list)
    recommended_sales_angle: str
    next_immediate_action: str
