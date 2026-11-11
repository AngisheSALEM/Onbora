from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdmin
from .models import DynamicsConnection
from .dynamics_service import DynamicsConnectionService
from kam.integrations.dynamics.client import DataverseClientException


class DynamicsConnectionView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(DynamicsConnectionService.describe())

    def put(self, request):
        return Response(DynamicsConnectionService.save(request.data))


class DynamicsConnectionTestView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        try:
            return Response(DynamicsConnectionService.test())
        except DataverseClientException:
            DynamicsConnection.objects.filter(pk=1).update(verified_at=None)
            return Response({'detail': 'Connexion refusée ou indisponible. Vérifiez les identifiants et le rôle de l’utilisateur d’application dans Power Platform, puis réessayez.'}, status=400)
