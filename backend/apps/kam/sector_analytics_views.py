"""Authenticated sector analytics endpoint."""
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsKAMOrAdmin
from kam.services.sector_analytics_service import get_sector_analytics


class KamSectorAnalyticsView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        return Response(get_sector_analytics(request.user))
