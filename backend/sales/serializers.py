from rest_framework import serializers
from .models import Enterprise, VisitPreparation, VisitReport

class EnterpriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enterprise
        fields = ['id', 'name', 'website', 'sector', 'approximate_size', 'location', 'existing_crm_data', 'created_at']

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
