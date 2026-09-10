from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class ClientFollowupEmail(BaseModel):
    subject: str = Field(..., description="Objet percutant du mail de suivi.")
    body: str = Field(..., description="Corps complet du mail de suivi.")


class KeyContact(BaseModel):
    name: str
    role: str
    influence: str = Field("DECISION_MAKER")


class CRMPayload(BaseModel):
    deal_stage: str = Field("QUALIFIED_OPPORTUNITY")
    probability: int = Field(70, ge=0, le=100)
    estimated_mrr_usd: Optional[float] = None
    identified_products: List[str] = Field(default_factory=list)
    next_step: str = Field(...)
    next_followup_date: str = Field(...)
    key_contacts: List[KeyContact] = Field(default_factory=list)


class ActionTask(BaseModel):
    id: Optional[str] = None
    task: str = Field(..., description="Description de la tache concrete.")
    deadline: str = Field(..., description="Echeance (ex: J+1 ou YYYY-MM-DD).")
    priority: str = Field("HIGH", description="'HIGH', 'MEDIUM', ou 'LOW'.")
    is_urgent_48h: bool = True
    status: str = "TODO"


class PostCallInput(BaseModel):
    kam_name: str
    client_name: str = "Direction"
    client_role: str = "DSI"
    company_name: str
    meeting_transcript: str
    orange_catalog_context: Optional[List[str]] = Field(default_factory=list)


class PostCallOutput(BaseModel):
    executive_summary: str = Field(..., description="Synthese executive de la reunion.")
    confirmed_needs: List[str] = Field(default_factory=list)
    objections_raised: List[str] = Field(default_factory=list)
    client_followup_email: ClientFollowupEmail
    crm_payload: CRMPayload
    action_tasks: List[ActionTask] = Field(default_factory=list)
