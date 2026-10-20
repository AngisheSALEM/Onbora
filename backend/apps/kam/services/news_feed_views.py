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
      - category: EXPANSION | MANAGEMENT | TECH_PROJECT | INCIDENT | FINANCE | NEW_ACCOUNT
      - search: terme de recherche
      - saved: true | false
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        feed_type = request.query_params.get('type', 'ALL').upper()
        category = request.query_params.get('category')
        search = request.query_params.get('search')
        saved_param = request.query_params.get('saved')
        
        is_saved = None
        if saved_param is not None:
            is_saved = saved_param.lower() in ('true', '1', 'yes')

        data = B2BNewsFeedService.get_feed(
            user=request.user,
            feed_type=feed_type,
            category=category,
            search=search,
            is_saved=is_saved
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
    Relance la détection et la veille des nouveaux comptes et signaux B2B.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            count = B2BNewsFeedService.seed_sample_news(request.user)
            return Response({
                "message": f"{count} nouveaux signaux de veille B2B synchronisés avec succès.",
                "count": count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("Erreur rafraîchissement flux B2B: %s", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
