"""Thin authenticated entry points; remote credentials never cross this boundary."""
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from ..access import visible_enterprises
from ..models import CompanyResearchJob
from .jobs import ACTIVE, enqueue_research, serialize_research


class CompanyResearchCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, enterprise_id):
        if not isinstance(request.data, dict):
            raise ValidationError("Un objet JSON est requis.")
        enterprise = get_object_or_404(visible_enterprises(request.user), pk=enterprise_id)
        job = enqueue_research(request.user, enterprise, request.headers.get("Idempotency-Key"),
            operation=request.data.get("operation", "research"), baseline_id=request.data.get("baseline_id"),
            fields=request.data.get("requested_fields"))
        return Response(serialize_research(job), status=202 if job.state in ACTIVE else 200)


class CompanyResearchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(CompanyResearchJob.objects.filter(owner=request.user,
            enterprise__in=visible_enterprises(request.user)), pk=job_id)
        return Response(serialize_research(job), headers={"Retry-After": "2"})
