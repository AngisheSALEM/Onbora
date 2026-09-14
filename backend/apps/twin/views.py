from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from twin.services.roi_calculator_service import ROICalculatorService
from shared.domain.ai_qualification import TieredPackage


class CalculateROIView(APIView):
    """
    POST: Calcule le Coût de l'Inaction (COI) et le ROI net pour un prospect.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        impacted_employees = int(request.data.get('impacted_employees', 6))
        downtime_hours = float(request.data.get('downtime_hours_per_month', 4.0))
        hourly_wage = float(request.data.get('hourly_wage_usd', 12.0))
        lost_sales = float(request.data.get('monthly_lost_sales_usd', 0.0))

        coi_data = ROICalculatorService.calculate_custom_coi(
            impacted_employees=impacted_employees,
            downtime_hours_per_month=downtime_hours,
            hourly_wage_usd=hourly_wage,
            monthly_lost_sales_usd=lost_sales,
        )

        monthly_coi = coi_data['total_monthly_coi_usd']

        # Évaluation des 3 formules types
        packages = [
            TieredPackage(
                tier="ESSENTIAL",
                name="Pack Connectivité Pro Essentiel (Fibre 50M)",
                monthly_price_usd=180.0,
                estimated_msp_cost_usd=110.0,
                gross_margin_percent=38.9,
                monthly_net_gain_usd=round(monthly_coi - 180.0, 2),
                roi_percent=round(((monthly_coi - 180.0) / 180.0) * 100, 1),
                key_features=["Fibre 50 Mbps symétrique", "GTR 4h", "Routeur managé"],
                pitch="Stabilité immédiate et 0 coupure de caisse.",
                objection_killer="Secours 4G inclus."
            ),
            TieredPackage(
                tier="PERFORMANCE",
                name="Pack Entreprise Performance (Fibre 100M + M365)",
                monthly_price_usd=320.0,
                estimated_msp_cost_usd=175.0,
                gross_margin_percent=45.3,
                monthly_net_gain_usd=round(monthly_coi - 320.0, 2),
                roi_percent=round(((monthly_coi - 320.0) / 320.0) * 100, 1),
                key_features=["Fibre 100 Mbps + Backup 4G", "Microsoft 365 Business", "Antivirus EDR Cloud"],
                pitch=f"Protège vos {impacted_employees} salariés et génère un gain net de {monthly_coi - 320:,.0f} $/mois.",
                objection_killer="Rentabilisé dès le 1er mois sans surcoût d'installation."
            ),
            TieredPackage(
                tier="SOVEREIGN",
                name="Pack Sérénité Totale & Cyberdéfense (200M)",
                monthly_price_usd=550.0,
                estimated_msp_cost_usd=260.0,
                gross_margin_percent=52.7,
                monthly_net_gain_usd=round(monthly_coi - 550.0, 2),
                roi_percent=round(((monthly_coi - 550.0) / 550.0) * 100, 1),
                key_features=["Fibre 200 Mbps double adduction", "Backup Cloud Immuable", "Supervision SOC 24/7"],
                pitch="Disponibilité 99.9% et conformité totale pour données sensibles.",
                objection_killer="Audit de sécurité offert."
            ),
        ]

        evaluated_packages = [
            ROICalculatorService.evaluate_package_profitability(pkg, monthly_coi)
            for pkg in packages
        ]

        return Response({
            "coi_metrics": coi_data,
            "tiered_packages": evaluated_packages,
            "recommended_tier": "PERFORMANCE",
            "executive_roi_pitch": f"En éliminant {downtime_hours}h de coupure/mois, le Pack Performance à 320 $/mois génère un gain net de {monthly_coi - 320:,.0f} $/mois (+{((monthly_coi - 320) / 320) * 100:.0f}% de ROI)."
        }, status=status.HTTP_200_OK)
