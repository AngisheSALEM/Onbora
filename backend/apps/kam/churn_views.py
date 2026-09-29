"""
Churn Radar & Portfolio Summary DRF Endpoints
=============================================
Vues DRF minces (Thin Views) déléguant la logique métier à ChurnRadarService.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .services.churn_radar_service import ChurnRadarService
from accounts.permissions import IsKAMOrAdmin


class PortfolioSummaryView(APIView):
    """
    GET: Résumé analytique du portefeuille pour le dashboard principal :
    - 4 compteurs principaux
    - Séries historiques (7j, 30j, 90j)
    - Comptes prioritaires
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        summary = ChurnRadarService.get_portfolio_summary(request.user)
        return Response(summary, status=status.HTTP_200_OK)


class ChurnRadarRiskAccountsView(APIView):
    """GET: Comptes à risque élevé pour /kam/accounts/risk."""
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        accounts = ChurnRadarService.get_risk_accounts(request.user)
        return Response(accounts, status=status.HTTP_200_OK)


class ChurnRadarRenewalsAccountsView(APIView):
    """GET: Renouvellements à surveiller (< 90j) pour /kam/accounts/renewals."""
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        accounts = ChurnRadarService.get_renewals_accounts(request.user)
        return Response(accounts, status=status.HTTP_200_OK)


class ChurnRadarUpsellAccountsView(APIView):
    """GET: Opportunités d'upsell pour /kam/accounts/upsell."""
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        accounts = ChurnRadarService.get_upsell_accounts(request.user)
        return Response(accounts, status=status.HTTP_200_OK)


class ChurnRadarNoActionAccountsView(APIView):
    """GET: Comptes sans prochaine action (> 14j) pour /kam/accounts/no-action."""
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        accounts = ChurnRadarService.get_no_action_accounts(request.user)
        return Response(accounts, status=status.HTTP_200_OK)


class AccountRadarDetailView(APIView):
    """GET: Détail du diagnostic Radar de Churn pour une entreprise spécifique."""
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, enterprise_id: int):
        from sales.models import Enterprise
        enterprise = Enterprise.objects.filter(id=enterprise_id, assigned_kam=request.user).first()
        if not enterprise:
            return Response({"error": "Entreprise introuvable ou non assignée"}, status=status.HTTP_404_NOT_FOUND)
        detail = ChurnRadarService.get_account_radar_detail(enterprise_id)
        return Response(detail, status=status.HTTP_200_OK)


class ChurnRadarRecalculateView(APIView):
    """POST: Déclenche un recalcul en direct (déterministe et/ou Core AI)."""
    permission_classes = [IsKAMOrAdmin]

    def post(self, request):
        use_ai = request.data.get('use_ai', False)
        enterprise_id = request.data.get('enterprise_id')

        if enterprise_id:
            from sales.models import Enterprise
            ent = Enterprise.objects.filter(id=enterprise_id, assigned_kam=request.user).first()
            if not ent:
                return Response({"error": "Entreprise introuvable ou non assignée"}, status=status.HTTP_404_NOT_FOUND)
            assessment = ChurnRadarService.refresh_account_assessment(ent, use_ai=use_ai)
            return Response({"detail": f"Évaluation actualisée pour {ent.name}", "health_score": assessment.health_score}, status=status.HTTP_200_OK)

        enterprises = ChurnRadarService.get_user_enterprises(request.user)
        for ent in enterprises:
            ChurnRadarService.refresh_account_assessment(ent, use_ai=use_ai)

        return Response({"detail": f"Recalcul effectué pour {len(enterprises)} compte(s)."}, status=status.HTTP_200_OK)
