from typing import Dict, Any, List
from shared.domain.ai_qualification import COIEstimation, TieredPackage, AIQualificationResult


class ROICalculatorService:
    """
    Service de calcul financier déterministe pour le Business Twin :
    - Coût de l'Inaction (COI)
    - Gains Nets client
    - Marges Brutes MSP
    """

    @staticmethod
    def calculate_custom_coi(
        impacted_employees: int,
        downtime_hours_per_month: float,
        hourly_wage_usd: float = 12.0,
        monthly_lost_sales_usd: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calcule les pertes financières réelles d'une entreprise en fonction de ses paramètres.
        """
        coi = COIEstimation(
            impacted_employees=impacted_employees,
            downtime_hours_per_month=downtime_hours_per_month,
            hourly_wage_usd=hourly_wage_usd,
            monthly_lost_sales_usd=monthly_lost_sales_usd
        )
        coi.compute()
        
        return {
            'impacted_employees': coi.impacted_employees,
            'downtime_hours_per_month': coi.downtime_hours_per_month,
            'hourly_wage_usd': coi.hourly_wage_usd,
            'monthly_payroll_loss_usd': coi.monthly_payroll_loss_usd,
            'monthly_lost_sales_usd': coi.monthly_lost_sales_usd,
            'total_monthly_coi_usd': coi.total_monthly_coi_usd,
            'annual_coi_usd': coi.annual_coi_usd,
            'explanation': (
                f"L'entreprise subit {coi.downtime_hours_per_month}h d'arrêt/lenteur par mois sur {coi.impacted_employees} salariés, "
                f"soit {coi.monthly_payroll_loss_usd:,.0f} $/mois de masse salariale improductive et {coi.monthly_lost_sales_usd:,.0f} $/mois de ventes manquées."
            )
        }

    @staticmethod
    def evaluate_package_profitability(
        package: TieredPackage,
        monthly_coi_usd: float
    ) -> Dict[str, Any]:
        """
        Calcule le ROI et la rentabilité d'une offre pour le client et le MSP.
        """
        monthly_net_gain = round(monthly_coi_usd - package.monthly_price_usd, 2)
        roi_percent = round((monthly_net_gain / package.monthly_price_usd) * 100, 1) if package.monthly_price_usd > 0 else 0
        
        return {
            'tier': package.tier,
            'name': package.name,
            'monthly_price_usd': package.monthly_price_usd,
            'estimated_msp_cost_usd': package.estimated_msp_cost_usd,
            'gross_margin_percent': package.gross_margin_percent,
            'monthly_net_gain_usd': monthly_net_gain,
            'roi_percent': roi_percent,
            'key_features': package.key_features,
            'pitch': package.pitch,
            'objection_killer': package.objection_killer,
            'is_margin_compliant': package.gross_margin_percent >= 35.0, # Garde-fou de marge MSP
        }
