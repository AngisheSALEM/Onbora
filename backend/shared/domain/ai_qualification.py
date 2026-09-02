from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod


@dataclass
class BANTScore:
    """
    Scoring BANT (Budget, Authority, Need, Timeline) pour disqualifier les prospects fantômes.
    """
    budget_score: int = 0         # 0 à 25
    authority_score: int = 0      # 0 à 25
    need_score: int = 0           # 0 à 25
    timeline_score: int = 0       # 0 à 25
    total_score: int = 0          # 0 à 100
    status: str = "QUALIFIED"     # 'HOT_LEAD', 'QUALIFIED', 'ATTENTION_BUDGET', 'ATTENTION_DECIDER', 'DISQUALIFIED'
    disqualification_reason: Optional[str] = None

    def calculate_total(self) -> None:
        self.total_score = self.budget_score + self.authority_score + self.need_score + self.timeline_score
        if self.budget_score < 10 or self.authority_score < 10 or self.timeline_score < 5:
            self.status = "DISQUALIFIED"
            if self.budget_score < 10:
                self.disqualification_reason = "Budget insuffisant ou non priorisé (< 150 $/mois)"
            elif self.authority_score < 10:
                self.disqualification_reason = "Interlocuteur sans mandat de décision financière"
            else:
                self.disqualification_reason = "Échéance du projet supérieure à 12 mois (Froid)"
        elif self.total_score >= 80:
            self.status = "HOT_LEAD"
        else:
            self.status = "QUALIFIED"


@dataclass
class COIEstimation:
    """
    Estimation chiffrée du Coût de l'Inaction (Cost of Inaction) pour défendre la valeur MSP.
    """
    impacted_employees: int = 5
    downtime_hours_per_month: float = 4.0
    hourly_wage_usd: float = 12.0
    monthly_payroll_loss_usd: float = 240.0
    monthly_lost_sales_usd: float = 500.0
    total_monthly_coi_usd: float = 740.0
    annual_coi_usd: float = 8880.0

    def compute(self) -> None:
        self.monthly_payroll_loss_usd = round(self.impacted_employees * self.downtime_hours_per_month * self.hourly_wage_usd, 2)
        self.total_monthly_coi_usd = round(self.monthly_payroll_loss_usd + self.monthly_lost_sales_usd, 2)
        self.annual_coi_usd = round(self.total_monthly_coi_usd * 12, 2)


@dataclass
class TieredPackage:
    """
    Offre MSP packagée à marge garantie pour arrêter la vente au rabais / poste.
    """
    tier: str                      # 'ESSENTIAL', 'PERFORMANCE', 'SOVEREIGN'
    name: str                      # ex: "Pack Fibre Pro Essentiel"
    monthly_price_usd: float       # Prix facturé au client
    estimated_msp_cost_usd: float  # Coût direct opérateur / licence pour le MSP
    gross_margin_percent: float    # Marge brute MSP (ex: 42.5%)
    monthly_net_gain_usd: float    # COI mensuel - Prix de l'offre
    roi_percent: float             # (Gain Net / Prix) * 100
    key_features: List[str] = field(default_factory=list)
    pitch: str = ""
    objection_killer: str = ""


@dataclass
class AIQualificationResult:
    """
    Contrat d'échange complet entre le moteur d'IA et le système Onbora.
    """
    enterprise_name: str
    sector: str
    bant: BANTScore
    coi: COIEstimation
    packages: List[TieredPackage]
    recommended_tier: str
    detected_needs: List[str] = field(default_factory=list)
    detected_objections: List[str] = field(default_factory=list)
    executive_summary: str = ""
    email_follow_up_j1: str = ""
    email_follow_up_j4: str = ""
    technical_handover_specs: Dict[str, Any] = field(default_factory=dict)


class IAIQualificationProvider(ABC):
    """
    Port d'interface Clean Architecture pour l'intelligence de qualification et de chiffrage.
    """
    @abstractmethod
    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        """Analyse le compte-rendu ou la transcription pour extraire BANT, COI, Packages, et Handover."""
        raise NotImplementedError

    @abstractmethod
    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        """Génère le score BANT initial avant la visite sur le terrain."""
        raise NotImplementedError
