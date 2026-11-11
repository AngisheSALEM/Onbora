from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdmin, IsKAMOrAdmin
from .models import DynamicsConnection, DynamicsImportRun, DynamicsImportedRecord
from .dynamics_service import DynamicsConnectionService
from .dynamics_mapping import discover
from .dynamics_import_service import describe_run, enqueue
from kam.integrations.dynamics.client import DataverseClientException


class DynamicsImportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        config = DynamicsConnection.objects.filter(pk=1).first()
        return Response({
            'mapping': config.import_mapping if config else {},
            'latest': describe_run(DynamicsImportRun.objects.order_by('-created_at').first()),
            'recent': [describe_run(run) for run in DynamicsImportRun.objects.order_by('-created_at')[:5]],
        })

    def post(self, request):
        try:
            return Response(describe_run(enqueue()), status=202)
        except DataverseClientException as exc:
            return Response({'detail': str(exc)}, status=400)


class DynamicsMappingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        config = get_object_or_404(DynamicsConnection, pk=1)
        class Input(serializers.Serializer):
            offer_entity = serializers.RegexField(r'^[a-z][a-z0-9_]*$', required=False, allow_blank=True, max_length=100)
        data = Input(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            mapping = discover(DynamicsConnectionService.client(), data.validated_data.get('offer_entity'))
        except DataverseClientException:
            return Response({'detail': 'Détection impossible. Vérifiez les droits de lecture des métadonnées Dynamics et réessayez.'}, status=400)
        saved = DynamicsConnection.objects.filter(pk=1, updated_at=config.updated_at).update(import_mapping=mapping)
        if not saved:
            return Response({'detail': 'La connexion a changé. Relancez la détection.'}, status=409)
        return Response(mapping)


class DynamicsImportedRecordsView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        class Query(serializers.Serializer):
            enterprise_id = serializers.IntegerField(min_value=1)
            kind = serializers.ChoiceField(choices=['accounts', 'contacts', 'offers', 'opportunities', 'appointments', 'activity'], required=False)
            offset = serializers.IntegerField(min_value=0, default=0)
        query = Query(data=request.query_params)
        query.is_valid(raise_exception=True)
        records = DynamicsImportedRecord.objects.select_related('enterprise').filter(
            enterprise_id=query.validated_data['enterprise_id'],
        )
        if request.user.role == 'KAM' and not request.user.is_superuser:
            records = records.filter(enterprise__assigned_kam=request.user)
        kind = query.validated_data.get('kind')
        if kind:
            records = records.filter(kind__in=['opportunities', 'appointments'] if kind == 'activity' else [kind])
        offset = query.validated_data['offset']
        page = list(records.order_by('kind', 'remote_id')[offset:offset + 51])
        return Response({'results': [{
            'kind': record.kind, 'remote_id': record.remote_id, 'data': record.data,
            'last_imported_at': record.last_imported_at,
        } for record in page[:50]], 'next_offset': offset + 50 if len(page) > 50 else None})
