from rest_framework import serializers
from .models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession, ScraperCredential


class PlaqueSerializer(serializers.ModelSerializer):
    total_enterprises = serializers.IntegerField(read_only=True, required=False)
    ready_count = serializers.IntegerField(read_only=True, required=False)
    assigned_salespersons_names = serializers.ListField(read_only=True, required=False)

    class Meta:
        model = Plaque
        fields = [
            'id', 'code', 'name', 'city', 'latitude', 'longitude', 'radius_km',
            'is_active', 'total_enterprises', 'ready_count', 'assigned_salespersons_names', 'created_at'
        ]


class EnterpriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enterprise
        fields = [
            'id', 'plaque_rel', 'plaque', 'name', 'website', 'sector', 'approximate_size', 'location',
            'latitude', 'longitude', 'scraping_status', 'scraped_data',
            'ai_hypotheses', 'ai_tailored_pitch', 'ai_key_questions', 'ai_potential_objections',
            'is_ready_for_conversion', 'conversion_score', 'recommended_solution',
            'existing_crm_data', 'siren', 'siret', 'kaabu_organization_id',
            'arrowsphere_tenant_id', 'sync_status', 'last_sync_date', 'created_at'
        ]


class PlaqueDetailSerializer(serializers.ModelSerializer):
    enterprises = EnterpriseSerializer(many=True, read_only=True)
    assigned_salespersons_details = serializers.SerializerMethodField()

    class Meta:
        model = Plaque
        fields = [
            'id', 'code', 'name', 'city', 'latitude', 'longitude', 'radius_km',
            'is_active', 'assigned_salespersons_details', 'enterprises', 'created_at'
        ]

    def get_assigned_salespersons_details(self, obj):
        return [
            {"id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip() or u.username}
            for u in obj.assigned_salespersons.all()
        ]


class EnterpriseMapSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    sector = serializers.CharField()
    approximate_size = serializers.CharField()
    location = serializers.CharField()
    plaque = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    is_ready_for_conversion = serializers.BooleanField()
    conversion_score = serializers.IntegerField()
    recommended_solution = serializers.CharField()
    existing_crm_status = serializers.CharField()


class EnterpriseBriefSerializer(serializers.Serializer):
    enterprise_id = serializers.IntegerField()
    enterprise_name = serializers.CharField()
    sector = serializers.CharField()
    approximate_size = serializers.CharField()
    location = serializers.CharField()
    plaque = serializers.CharField()
    conversion_score = serializers.IntegerField()
    recommended_solution = serializers.CharField()
    meeting_objective = serializers.CharField()
    hypothesis_to_verify = serializers.CharField()
    custom_pitch = serializers.CharField()
    key_questions = serializers.CharField()
    ai_hypotheses = serializers.ListField(required=False)
    ai_potential_objections = serializers.ListField(required=False)
    recommended_catalog_services = serializers.ListField()


class SalespersonActivitySerializer(serializers.Serializer):
    active_meetings = serializers.ListField()
    recent_reports = serializers.ListField()
    total_visits_count = serializers.IntegerField()
    total_transmitted_count = serializers.IntegerField()
    conversion_rate = serializers.FloatField()


class LiveVisitSessionSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    salesperson_name = serializers.CharField(source='salesperson.username', read_only=True)

    class Meta:
        model = LiveVisitSession
        fields = [
            'id', 'preparation', 'enterprise', 'enterprise_name', 'salesperson', 'salesperson_name',
            'session_status', 'live_transcript', 'detected_needs', 'detected_objections',
            'live_proposition', 'created_at', 'updated_at'
        ]


class LiveCopilotTurnSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    enterprise_id = serializers.IntegerField()
    enterprise_name = serializers.CharField()
    active_sentiment = serializers.CharField()
    detected_needs = serializers.ListField()
    detected_objections = serializers.ListField()
    realtime_proposition = serializers.DictField()


class VisitPreparationSerializer(serializers.ModelSerializer):
    enterprise_details = EnterpriseSerializer(source='enterprise', read_only=True)
    salesperson_username = serializers.CharField(source='salesperson.username', read_only=True)

    class Meta:
        model = VisitPreparation
        fields = [
            'id', 'enterprise', 'enterprise_details', 'salesperson', 'salesperson_username',
            'hypothesis_to_verify', 'custom_pitch', 'key_questions', 'meeting_objective',
            'scheduled_date', 'created_at'
        ]
        read_only_fields = ['id', 'salesperson', 'created_at']


class VisitReportSerializer(serializers.ModelSerializer):
    preparation_details = VisitPreparationSerializer(source='preparation', read_only=True)
    has_dossier = serializers.SerializerMethodField()

    class Meta:
        model = VisitReport
        fields = [
            'id', 'preparation', 'preparation_details', 'raw_transcript', 'executive_summary',
            'confirmed_needs', 'objections_raised', 'actions_todo', 'follow_up_email_draft',
            'audio_file_path', 'original_ai_output', 'ai_feedback_rating', 'ai_feedback_comments',
            'ai_feedback_sent_at', 'has_dossier', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_has_dossier(self, obj):
        return obj.dossiers.exists()


class CoreAIFeedbackSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comments = serializers.CharField(required=False, allow_blank=True)


class ScraperCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScraperCredential
        fields = ['id', 'platform', 'cookies_value', 'updated_at']
        read_only_fields = ['id', 'updated_at']
