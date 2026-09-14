from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ScoringTier(str, Enum):
    TIER_1_PRIORITY = "TIER_1_PRIORITY"
    TIER_2_MEDIUM = "TIER_2_MEDIUM"
    TIER_2_PROSPECT = "TIER_2_PROSPECT"
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

    @field_validator("conversion_probability", mode="before")
    @classmethod
    def normalize_probability(cls, v):
        if isinstance(v, str):
            v_up = v.upper().strip()
            if v_up in ("MODERATE", "MOYEN", "MOYENNE"):
                return "MEDIUM"
            if v_up in ("HAUT", "HAUTE", "ELEVE", "ELEVEE"):
                return "HIGH"
            if v_up in ("BAS", "BASSE", "FAIBLE"):
                return "LOW"
        return v

    @field_validator("scoring_tier", mode="before")
    @classmethod
    def normalize_tier(cls, v):
        if isinstance(v, str):
            v_up = v.upper().strip()
            if "TIER_1" in v_up or "TIER 1" in v_up:
                return ScoringTier.TIER_1_PRIORITY
            if "TIER_2" in v_up or "TIER 2" in v_up:
                return ScoringTier.TIER_2_MEDIUM
            if "TIER_3" in v_up or "TIER 3" in v_up:
                return ScoringTier.TIER_3_NURTURING
        return v
