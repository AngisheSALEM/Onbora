"""Signal history, analytics and personal follow-up endpoints."""
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsKAMOrAdmin
from kam.services.analysis_signals_service import (CATEGORIES, CONFIDENCES, PRIORITIES, STATES,
    review_signal, signal_dashboard, signal_detail)


class SignalFilters(serializers.Serializer):
    days = serializers.ChoiceField(choices=['7', '30', '90', '365'], required=False)
    start = serializers.DateField(required=False)
    end = serializers.DateField(required=False)
    sector = serializers.CharField(required=False, allow_blank=True, max_length=100)
    category = serializers.ChoiceField(choices=CATEGORIES, required=False)
    confidence = serializers.ChoiceField(choices=CONFIDENCES, required=False)
    priority = serializers.ChoiceField(choices=PRIORITIES, required=False)
    state = serializers.ChoiceField(choices=STATES, required=False)
    q = serializers.CharField(required=False, allow_blank=True, max_length=200)
    focus_sector = serializers.CharField(required=False, allow_blank=True, max_length=100)
    focus_category = serializers.ChoiceField(choices=CATEGORIES, required=False)
    focus_confidence = serializers.ChoiceField(choices=CONFIDENCES, required=False)
    focus_priority = serializers.ChoiceField(choices=PRIORITIES, required=False)
    focus_state = serializers.ChoiceField(choices=STATES, required=False)
    focus_day = serializers.DateField(required=False)
    page = serializers.IntegerField(min_value=1, max_value=100000, default=1)


class SignalReviewInput(serializers.Serializer):
    state = serializers.ChoiceField(choices=STATES, required=False)
    priority = serializers.ChoiceField(choices=PRIORITIES, required=False)
    note = serializers.CharField(max_length=2000, allow_blank=True, required=False)


class AnalysisSignalsView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        params = SignalFilters(data=request.query_params)
        params.is_valid(raise_exception=True)
        return Response(signal_dashboard(request.user, params.validated_data))


class AnalysisSignalDetailView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, pk):
        pagination = serializers.IntegerField(min_value=1, max_value=100000)
        page = pagination.run_validation(request.query_params.get('history_page', 1))
        return Response(signal_detail(request.user, pk, page))

    def patch(self, request, pk):
        values = SignalReviewInput(data=request.data)
        values.is_valid(raise_exception=True)
        return Response(review_signal(request.user, pk, values.validated_data))
