from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class CompanyOverview(BaseModel):
    summary: str = Field(..., description="Synthese de l'entreprise : positionnement, taille, enjeux strategiques.")
    estimated_employees: str = Field(..., description="Estimation de l'effectif, ex : '1500+', '50-100'.")
    digital_maturity: str = Field(..., description="Maturite digitale : 'LOW', 'MEDIUM' ou 'HIGH'.")


class DecisionMaker(BaseModel):
    role: str = Field(..., description="Titre/Role du decideur, ex : 'DSI (Directeur des SI)'.")
    profile_type: str = Field(..., description="Profil psychologique commercial, ex : 'Technique & Disponibilite'.")
    concerns: str = Field(..., description="Preoccupations majeures et douleurs metier specifiques a ce role.")


class PitchAngle(BaseModel):
    target_offer: str = Field(..., description="Offre Orange Business ciblee (issue du catalogue).")
    why_relevant: str = Field(..., description="Justification de la pertinence de cette offre pour ce prospect.")
    hook_sentence: str = Field(..., description="Phrase d'accroche percutante pour lancer la discussion.")


class PreCallInput(BaseModel):
    company_name: str
    sector: str
    locations_count: Optional[int] = Field(1, ge=1)
    website_url: Optional[str] = None
    annual_revenue: Optional[float] = None
    current_operator: Optional[str] = None
    current_connectivity: Optional[str] = None
    known_context: Optional[str] = ""
    orange_catalog_context: Optional[List[str]] = Field(default_factory=list)


class PreCallOutput(BaseModel):
    company_overview: CompanyOverview
    key_decision_makers: List[DecisionMaker] = Field(..., min_length=1)
    detected_business_challenges: List[str] = Field(..., min_length=1)
    custom_pitch_angles: List[PitchAngle] = Field(..., min_length=1)
    critical_discovery_questions: List[str] = Field(..., min_length=1)
    golden_rules: List[str] = Field(default_factory=list)
