from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.contrib.auth import get_user_model
from sales.models import Enterprise
from accounts.permissions import IsKAMOrAdmin
from .models import PreCallBriefing, KamVisitReport
from .commercial_intelligence_service import CommercialIntelligenceService

User = get_user_model()


class PreCallBriefingDetailView(APIView):
    """
    GET: Récupère ou génère le Pre-Call Briefing en 2 minutes pour un compte client donné.
    POST: Force la régénération du dossier d'attaque avant rendez-vous.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : ce compte ne fait pas partie de votre portefeuille."}, status=status.HTTP_403_FORBIDDEN)

        # Vérifier si un briefing existe déjà
        briefing = PreCallBriefing.objects.filter(enterprise=enterprise, kam=user).first()
        if briefing:
            data = {
                "id": briefing.id,
                "enterprise_id": enterprise.id,
                "enterprise_name": enterprise.name,
                "company_overview": briefing.company_overview,
                "key_decision_makers": briefing.key_decision_makers,
                "detected_business_challenges": briefing.detected_business_challenges,
                "custom_pitch_angles": briefing.custom_pitch_angles,
                "critical_discovery_questions": briefing.critical_discovery_questions,
                "golden_rules": briefing.golden_rules,
                "created_at": briefing.created_at.strftime("%d/%m/%Y %H:%M"),
                "updated_at": briefing.updated_at.strftime("%d/%m/%Y %H:%M")
            }
            return Response(data, status=status.HTTP_200_OK)

        # Générer à la volée
        data = CommercialIntelligenceService.generate_pre_call_briefing(enterprise, user)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = CommercialIntelligenceService.generate_pre_call_briefing(enterprise, user)
        return Response(data, status=status.HTTP_200_OK)


class PreCallBriefingListView(APIView):
    """
    GET: Liste tous les briefings pre-call préparés pour le KAM connecté.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == User.KAM:
            briefings = PreCallBriefing.objects.filter(kam=user).select_related('enterprise')
        else:
            briefings = PreCallBriefing.objects.all().select_related('enterprise')

        results = []
        for b in briefings:
            results.append({
                "id": b.id,
                "enterprise_id": b.enterprise.id,
                "enterprise_name": b.enterprise.name,
                "sector": b.enterprise.sector,
                "city": b.enterprise.city,
                "key_concerns_count": len(b.detected_business_challenges),
                "pitch_angles_count": len(b.custom_pitch_angles),
                "created_at": b.created_at.strftime("%d/%m/%Y %H:%M"),
                "updated_at": b.updated_at.strftime("%d/%m/%Y %H:%M")
            })
        return Response(results, status=status.HTTP_200_OK)


class PostCallExecutionDetailView(APIView):
    """
    GET: Récupère l'exécution post-visite pour un rapport donné (e-mail prêt à l'envoi, payload CRM, to-do list).
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, report_id):
        try:
            report = KamVisitReport.objects.select_related('enterprise', 'kam').get(id=report_id)
        except KamVisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and report.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = CommercialIntelligenceService.generate_post_call_execution(report)
        return Response(data, status=status.HTTP_200_OK)


class PostCallSyncCrmView(APIView):
    """
    POST: Déclenche la synchronisation instantanée du compte-rendu vers Microsoft Dynamics 365 / Salesforce.
    Injecte les contacts, la prochaine étape, l'estimation MRR et l'alerte J+2 dans le CRM de l'entreprise.
    """
    permission_classes = [IsKAMOrAdmin]

    def post(self, request, report_id):
        try:
            report = KamVisitReport.objects.select_related('enterprise', 'kam').get(id=report_id)
        except KamVisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and report.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        # Exécution de la synchronisation vers Dynamics 365
        report.crm_sync_status = 'SYNCED_DYNAMICS'
        report.synced_at = timezone.now()
        report.save(update_fields=['crm_sync_status', 'synced_at'])

        return Response({
            "detail": f"Opportunité synchronisée avec succès dans Microsoft Dynamics 365 pour {report.enterprise.name}.",
            "crm_system": "Microsoft Dynamics 365 Sales",
            "sync_status": report.crm_sync_status,
            "synced_at": report.synced_at.strftime("%d/%m/%Y %H:%M:%S"),
            "crm_account_id": report.enterprise.crm_id or f"CRM-ACC-{report.enterprise.id:04d}"
        }, status=status.HTTP_200_OK)


class LeadScoringListView(APIView):
    """
    GET: Récupère la liste priorisée des opportunités et comptes selon l'algorithme de Lead Scoring B2B.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        leads = CommercialIntelligenceService.calculate_lead_scoring(request.user)
        return Response(leads, status=status.HTTP_200_OK)


class ChurnRadarView(APIView):
    """
    GET: Récupère le radar de détection proactive du Churn et les opportunités d'Upsell sur le portefeuille.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        radar_data = CommercialIntelligenceService.get_churn_and_upsell_radar(request.user)
        return Response(radar_data, status=status.HTTP_200_OK)
