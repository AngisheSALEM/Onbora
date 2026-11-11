"""Administrator-only receiver for the standalone seed."""
from rest_framework import serializers
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from sales.seed_serializers import SeedRecordSerializer
from sales.services.seed_import import import_seed_record


class SeedRecordImportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdmin]

    def put(self, request, external_id):
        serializer = SeedRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if external_id != serializer.validated_data['external_id']:
            raise serializers.ValidationError({'external_id': 'La référence diffère de celle de l’URL.'})
        enterprise, created = import_seed_record(serializer.validated_data, dict(request.data))
        return Response({'external_id': external_id, 'enterprise_id': enterprise.pk, 'created': created},
                        status=201 if created else 200)
