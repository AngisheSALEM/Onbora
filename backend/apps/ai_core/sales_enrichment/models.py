from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SalesEnrichmentInput(BaseModel):
    company_name: str
    sector: str = "Services B2B"
    website: Optional[str] = None
    scraped_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    orange_catalog_context: Optional[List[str]] = Field(default_factory=list)


class SalesEnrichmentOutput(BaseModel):
    hypotheses: List[str] = Field(..., min_length=1)
    tailored_pitch: str = Field(..., min_length=1)
    key_questions: List[str] = Field(..., min_length=1)
    potential_objections: List[str] = Field(..., min_length=1)
    recommended_solution: str = Field(...)
    conversion_score: int = Field(85, ge=0, le=100)
    provider: str = "Core-AI-Unified-Engine"
