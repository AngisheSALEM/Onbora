from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import DemoEvent
from .application.use_cases import GetDemoStatsUseCase, GetDemoLogsUseCase


class DemoStatsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        stats = GetDemoStatsUseCase().execute()
        return Response({
            "total_dossiers": stats.total_dossiers,
            "inbound_count": stats.inbound_count,
            "outbound_count": stats.outbound_count,
            "status_counts": stats.status_counts,
            "conversion_rate": stats.conversion_rate,
            "recent_logs": stats.recent_logs,
        }, status=status.HTTP_200_OK)


class DemoLogsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        logs = GetDemoLogsUseCase().execute()
        return Response(logs, status=status.HTTP_200_OK)
