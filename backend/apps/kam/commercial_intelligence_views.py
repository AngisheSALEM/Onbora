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
        clean_id = str(account_id).replace('account-', '')
        try:
            enterprise = Enterprise.objects.get(id=clean_id)
        except (Enterprise.DoesNotExist, ValueError):
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Permettre l'accès aux KAMs et Admins pour préparer tout compte / prospect
        # Vérifier si un briefing avec analysis_data existe déjà
        briefing = PreCallBriefing.objects.filter(enterprise=enterprise).first()
        if briefing and briefing.analysis_data:
            data = {
                "id": briefing.id,
                "enterprise_id": enterprise.id,
                "enterprise_name": enterprise.name,
                **briefing.analysis_data,
                "company_overview": briefing.company_overview,
                "key_decision_makers": briefing.key_decision_makers,
                "detected_business_challenges": briefing.detected_business_challenges,
                "custom_pitch_angles": briefing.custom_pitch_angles,
                "critical_discovery_questions": briefing.critical_discovery_questions,
                "golden_rules": briefing.golden_rules,
                "created_at": briefing.created_at.strftime("%d/%m/%Y %H:%M"),
                "updated_at": briefing.updated_at.strftime("%d/%m/%Y %H:%M"),
                "ai_engine": "Onbora Analysis (Port 8001 / AI Core)"
            }
            return Response(data, status=status.HTTP_200_OK)

        # Générer à la volée via Unified Core AI & Onbora Analysis Service
        data = CommercialIntelligenceService.generate_pre_call_briefing(enterprise, user)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, account_id):
        clean_id = str(account_id).replace('account-', '')
        try:
            enterprise = Enterprise.objects.get(id=clean_id)
        except (Enterprise.DoesNotExist, ValueError):
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        data = CommercialIntelligenceService.generate_pre_call_briefing(enterprise, user)
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, account_id):
        clean_id = str(account_id).replace('account-', '')
        try:
            enterprise = Enterprise.objects.get(id=clean_id)
        except (Enterprise.DoesNotExist, ValueError):
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        data = CommercialIntelligenceService.update_and_resynthesize_briefing(
            enterprise=enterprise,
            request_data=request.data,
            kam_user=request.user
        )
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, account_id):
        return self.patch(request, account_id)


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
    POST: Enclenche la synchronisation transactionnelle du compte-rendu vers Microsoft Dynamics 365.
    Insère une opération dans l'Outbox PostgreSQL (Epic 4) et exécute la livraison sécurisée.
    """
    permission_classes = [IsKAMOrAdmin]

    def post(self, request, report_id):
        from .models import SyncOperation
        from .integrations.dynamics.worker import DynamicsOutboxWorker

        try:
            report = KamVisitReport.objects.select_related('enterprise', 'kam').get(id=report_id)
        except KamVisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and report.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        # Insertion transactionnelle dans l'Outbox PostgreSQL
        sync_op = SyncOperation.objects.create(
            target_system='DYNAMICS_365',
            entity_type='APPOINTMENT',
            entity_id=str(report.id),
            operation='CREATE',
            payload={
                'subject': f"Compte-Rendu : {report.enterprise.name} ({report.kam.username})",
                'description': report.executive_summary,
                'confirmed_needs': report.confirmed_needs,
                'actions_todo': report.actions_todo,
                'regarding_account_id': report.enterprise.crm_id or str(report.enterprise.id),
            },
            status='PENDING'
        )

        # Déclenchement du worker (mode immédiat pour confirmation en direct)
        worker = DynamicsOutboxWorker()
        worker.process_pending_operations(batch_size=5)

        sync_op.refresh_from_db()
        report.refresh_from_db()

        return Response({
            "detail": f"Compte-rendu envoyé à la file d'attente Dynamics 365 pour {report.enterprise.name}.",
            "crm_system": "Microsoft Dynamics 365 Sales (Dataverse OData v9.2)",
            "outbox_operation_id": str(sync_op.id),
            "outbox_status": sync_op.status,
            "report_sync_status": report.crm_sync_status,
            "remote_activity_id": sync_op.remote_id or None,
            "synced_at": (report.synced_at or timezone.now()).strftime("%d/%m/%Y %H:%M:%S"),
            "crm_account_id": report.enterprise.crm_id or f"CRM-ACC-{report.enterprise.id:04d}"
        }, status=status.HTTP_200_OK)


class LeadScoringListView(APIView):
    """
    GET: Récupère la liste priorisée des opportunités et comptes selon l'algorithme de Lead Scoring B2B du Core AI.
    POST: Force le recalcul en direct par le Core AI.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        force_refresh = request.query_params.get('refresh', 'false').lower() in ['true', '1']
        leads = CommercialIntelligenceService.calculate_lead_scoring(request.user, force_refresh=force_refresh)
        return Response(leads, status=status.HTTP_200_OK)

    def post(self, request):
        leads = CommercialIntelligenceService.calculate_lead_scoring(request.user, force_refresh=True)
        return Response(leads, status=status.HTTP_200_OK)


class ChurnRadarView(APIView):
    """
    GET: Récupère le radar de détection proactive du Churn et les opportunités d'Upsell sur le portefeuille.
    POST: Force le recalcul en direct par le Core AI.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        force_refresh = request.query_params.get('refresh', 'false').lower() in ['true', '1']
        radar_data = CommercialIntelligenceService.get_churn_and_upsell_radar(request.user, force_refresh=force_refresh)
        return Response(radar_data, status=status.HTTP_200_OK)

    def post(self, request):
        radar_data = CommercialIntelligenceService.get_churn_and_upsell_radar(request.user, force_refresh=True)
        return Response(radar_data, status=status.HTTP_200_OK)
