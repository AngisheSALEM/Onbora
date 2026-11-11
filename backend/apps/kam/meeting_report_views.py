from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from accounts.models import User
from accounts.permissions import IsKAMOrAdmin
from sales.models import Enterprise
from .models import KamAppointment
from .services.meeting_report_service import extract_document, prepare_report, save_reviewed_report


class MeetingReportView(APIView):
    permission_classes = [IsKAMOrAdmin]
    operation = 'draft'

    def post(self, request, account_id=None, pk=None):
        appointment = None
        if pk is not None:
            appointment = get_object_or_404(KamAppointment.objects.select_related('enterprise'), pk=pk)
            enterprise = appointment.enterprise
            owner_id = appointment.kam_id
        else:
            enterprise = get_object_or_404(Enterprise, pk=account_id)
            owner_id = enterprise.assigned_kam_id
        if request.user.role == User.KAM and owner_id != request.user.pk:
            raise PermissionDenied('Vous n’avez pas accès à ce dossier.')
        if self.operation == 'document':
            upload = request.FILES.get('document')
            if not upload:
                raise serializers.ValidationError('Choisissez un document à joindre.')
            return Response(extract_document(upload))
        if self.operation == 'draft':
            return Response(prepare_report(enterprise, appointment, request.user, request.data))
        from .views import serialize_kam_visit_report
        report = save_reviewed_report(enterprise, appointment, request.user, request.data)
        return Response({'report': serialize_kam_visit_report(report)}, status=201)


class MeetingReportDocumentView(MeetingReportView):
    parser_classes = [MultiPartParser]
    operation = 'document'
