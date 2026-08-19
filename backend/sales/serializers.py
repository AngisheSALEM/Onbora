from rest_framework import serializers
from .models import Enterprise, VisitPreparation, VisitReport, ScraperCredential


class EnterpriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enterprise
        fields = [
            'id', 'name', 'website', 'sector', 'approximate_size', 'location', 
            'plaque', 'latitude', 'longitude', 'is_ready_for_conversion', 
            'conversion_score', 'recommended_solution', 'existing_crm_data', 
            'created_at', 'siren', 'siret', 'kaabu_organization_id', 'arrowsphere_tenant_id', 
            'sync_status', 'last_sync_date'
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
    recommended_catalog_services = serializers.ListField()


class PlaqueSerializer(serializers.Serializer):
    name = serializers.CharField()
    display_name = serializers.CharField()
    total_enterprises = serializers.IntegerField()
    ready_count = serializers.IntegerField()
    center_latitude = serializers.FloatField()
    center_longitude = serializers.FloatField()


class SalespersonActivitySerializer(serializers.Serializer):
    active_meetings = serializers.ListField()
    recent_reports = serializers.ListField()
    total_visits_count = serializers.IntegerField()
    total_transmitted_count = serializers.IntegerField()
    conversion_rate = serializers.FloatField()


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
            'audio_file_path', 'has_dossier', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_has_dossier(self, obj):
        return obj.dossiers.exists()


class ScraperCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScraperCredential
        fields = ['id', 'platform', 'cookies_value', 'updated_at']
        read_only_fields = ['id', 'updated_at']
