import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from kam.services.news_feed_service import B2BNewsFeedService
from kam.serializers import B2BNewsFeedItemSerializer

logger = logging.getLogger(__name__)


class B2BNewsFeedListView(APIView):
    """
    GET /api/kam/feed/
    Liste les actualités de veille B2B et de nouveaux comptes découverts sur le net.
    Paramètres :
      - type: ALL | PORTFOLIO | WEB_DISCOVERY
      - signal / signal_strength: ALL | STRONG | WEAK
      - category: EXPANSION | MANAGEMENT | TECH_PROJECT | INCIDENT | FINANCE | NEW_ACCOUNT
      - search: terme de recherche
      - saved: true | false
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        feed_type = request.query_params.get('type', 'ALL').upper()
        signal_param = request.query_params.get('signal') or request.query_params.get('signal_strength')
        category = request.query_params.get('category')
        search = request.query_params.get('search')
        enterprise_id = request.query_params.get('enterprise_id')
        saved_param = request.query_params.get('saved')
        
        is_saved = None
        if saved_param is not None:
            is_saved = saved_param.lower() in ('true', '1', 'yes')

        limit_param = request.query_params.get('limit')
        limit = 50
        if limit_param and limit_param.isdigit():
            limit = max(1, min(100, int(limit_param)))

        data = B2BNewsFeedService.get_feed(
            user=request.user,
            feed_type=feed_type,
            category=category,
            search=search,
            enterprise_id=enterprise_id,
            is_saved=is_saved,
            signal_strength=signal_param,
            limit=limit
        )

        serializer = B2BNewsFeedItemSerializer(data["items"], many=True)
        return Response({
            "count": data["total_count"],
            "counters": data["counters"],
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class B2BNewsFeedReadToggleView(APIView):
    """
    POST /api/kam/feed/<uuid:pk>/read/
    Marque une actualité comme lue ou non-lue.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        is_read = request.data.get('is_read', True)
        try:
            item = B2BNewsFeedService.mark_as_read(pk, is_read=bool(is_read))
            serializer = B2BNewsFeedItemSerializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur lecture actualité %s: %s", pk, e)
            return Response({"error": "Actualité introuvable"}, status=status.HTTP_404_NOT_FOUND)


class B2BNewsFeedSaveToggleView(APIView):
    """
    POST /api/kam/feed/<uuid:pk>/save/
    Bascule l'état sauvegardé / favori d'une actualité.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            item = B2BNewsFeedService.toggle_saved(pk)
            serializer = B2BNewsFeedItemSerializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur toggle favori actualité %s: %s", pk, e)
            return Response({"error": "Actualité introuvable"}, status=status.HTTP_404_NOT_FOUND)


class B2BNewsFeedConvertView(APIView):
    """
    POST /api/kam/feed/<uuid:pk>/convert/
    Convertit un nouveau compte découvert sur le net en compte entreprise B2B assigné au KAM.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            res = B2BNewsFeedService.convert_to_portfolio_account(pk, request.user)
            return Response(res, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur conversion compte web %s: %s", pk, e)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class B2BNewsFeedRefreshView(APIView):
    """
    POST /api/kam/feed/refresh/
    Relance la synchronisation avec Onbora Analysis Service (Port 8001) :
    - Rapprochement par nom (Matching)
    - Contrôle d'obsolescence temporel Core AI
    - Mise à jour et ré-analyse complète
    - Création des nouveaux leads
    - Vectorisation 768D immédiate
    - Provisioning direct du fil d'actualité pour le front
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from ai_core.company_analysis.sync_service import onbora_analysis_sync_service
            analysis_stats = onbora_analysis_sync_service.sync_all_jobs(limit=100)

            # Optionnel : complété par la découverte RSS
            market_stats = {"saved": 0}
            try:
                from apps.ai_core.services.discovery_jobs import enqueue_discovery
                job = enqueue_discovery(request.user, "entreprises B2B RDC")
                market_stats = {"saved": 0, "status": job.status, "job_id": str(job.pk)}
            except Exception as e:
                logger.warning("MarketIntelService discovery error (passé en arrière-plan) : %s", e)

            total_saved = analysis_stats["updated_accounts"] + analysis_stats["created_new_leads"] + market_stats.get("saved", 0)
            return Response({
                "message": f"Veille et intelligence Onbora Analysis synchronisées avec succès ({total_saved} signaux générés).",
                "analysis_sync": {
                    "total_fetched": analysis_stats["total_jobs_fetched"],
                    "updated_accounts": analysis_stats["updated_accounts"],
                    "created_new_leads": analysis_stats["created_new_leads"],
                    "skipped_obsolete": analysis_stats["skipped_obsolete"],
                    "errors_count": analysis_stats["errors"]
                },
                "market_intel": market_stats,
                "saved": total_saved
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur rafraichissement flux B2B: %s", e, exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class B2BEnterpriseNewsView(APIView):
    """
    GET /api/kam/accounts/<int:enterprise_id>/news/
    Retourne les cartes et signaux d'actualité spécifiques à une entreprise B2B.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, enterprise_id):
        category = request.query_params.get('category')
        signal_param = request.query_params.get('signal') or request.query_params.get('signal_strength')
        search = request.query_params.get('search')
        saved_param = request.query_params.get('saved')

        is_saved = None
        if saved_param is not None:
            is_saved = saved_param.lower() in ('true', '1', 'yes')

        data = B2BNewsFeedService.get_enterprise_feed(
            enterprise_id=enterprise_id,
            user=request.user,
            category=category,
            is_saved=is_saved,
            signal_strength=signal_param,
            search=search
        )

        serializer = B2BNewsFeedItemSerializer(data["items"], many=True)
        return Response({
            "count": data["total_count"],
            "counters": data["counters"],
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class B2BNewsFeedMarkAllReadView(APIView):
    """
    POST /api/kam/feed/mark-all-read/
    Marque toutes les actualités comme lues pour le KAM.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            count = B2BNewsFeedService.mark_all_as_read(request.user)
            return Response({"marked_read": count}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur mark-all-read: %s", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
