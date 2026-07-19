from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import DemoEvent
from kam.models import ProspectDossier
from discovery.models import ClientConversation

class DemoStatsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        total_dossiers = ProspectDossier.objects.count()
        inbound_count = ProspectDossier.objects.filter(source=ProspectDossier.INBOUND_CONVERSATION).count()
        outbound_count = ProspectDossier.objects.filter(source=ProspectDossier.OUTBOUND_VISIT).count()
        
        accepted_count = ProspectDossier.objects.filter(status=ProspectDossier.ACCEPTED).count()
        review_count = ProspectDossier.objects.filter(status=ProspectDossier.IN_REVIEW).count()
        new_count = ProspectDossier.objects.filter(status=ProspectDossier.NEW).count()
        
        conversion_rate = 0
        if total_dossiers > 0:
            conversion_rate = round((accepted_count / total_dossiers) * 100, 1)
            
        recent_logs = []
        for log in DemoEvent.objects.all()[:20]:
            recent_logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })
            
        return Response({
            "total_dossiers": total_dossiers,
            "inbound_count": inbound_count,
            "outbound_count": outbound_count,
            "status_counts": {
                "NEW": new_count,
                "IN_REVIEW": review_count,
                "ACCEPTED": accepted_count
            },
            "conversion_rate": conversion_rate,
            "recent_logs": recent_logs
        }, status=status.HTTP_200_OK)

class DemoLogsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        logs = []
        for log in DemoEvent.objects.all():
            logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })
        return Response(logs, status=status.HTTP_200_OK)
