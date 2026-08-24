from rest_framework import serializers
from accounts.models import User
from .models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession, ScraperCredential, SalesNotification


class SalespersonUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    assigned_plaques = serializers.SerializerMethodField()
    reports_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'phone', 'location', 'is_available', 'assigned_plaques', 'reports_count']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_assigned_plaques(self, obj):
        return [p.code for p in obj.assigned_plaques.all()]

    def get_reports_count(self, obj):
        return VisitReport.objects.filter(preparation__salesperson=obj).count()


class PlaqueSerializer(serializers.ModelSerializer):
    total_enterprises = serializers.SerializerMethodField()
    ready_count = serializers.SerializerMethodField()
    assigned_salespersons_names = serializers.SerializerMethodField()
    assigned_salespersons = serializers.SerializerMethodField()
    kml_url = serializers.SerializerMethodField()

    class Meta:
        model = Plaque
        fields = [
            'id', 'code', 'name', 'city', 'latitude', 'longitude', 'radius_km',
            'boundary_geojson', 'kml_data', 'kml_url',
            'is_active', 'total_enterprises', 'ready_count', 'assigned_salespersons', 'assigned_salespersons_names', 'created_at'
        ]

    def get_kml_url(self, obj):
        obj_id = getattr(obj, 'id', None)
        return f"/api/sales/plaques/{obj_id}/kml/" if obj_id else None

    def get_total_enterprises(self, obj):
        val = getattr(obj, 'total_enterprises', None)
        if val is not None and not callable(val):
            return val
        if hasattr(obj, 'enterprises'):
            return obj.enterprises.count()
        return 0

    def get_ready_count(self, obj):
        val = getattr(obj, 'ready_count', None)
        if val is not None and not callable(val):
            return val
        if hasattr(obj, 'enterprises'):
            return obj.enterprises.filter(is_ready_for_conversion=True).count()
        return 0

    def get_assigned_salespersons(self, obj):
        val = getattr(obj, 'assigned_salespersons', None)
        if isinstance(val, list):
            return val
        if hasattr(obj, 'assigned_salespersons') and hasattr(obj.assigned_salespersons, 'values_list'):
            return list(obj.assigned_salespersons.values_list('id', flat=True))
        return []

    def get_assigned_salespersons_names(self, obj):
        val = getattr(obj, 'assigned_salespersons_names', None)
        if isinstance(val, list):
            return val
        if hasattr(obj, 'assigned_salespersons') and hasattr(obj.assigned_salespersons, 'all'):
            return [f"{u.first_name} {u.last_name}".strip() or u.username for u in obj.assigned_salespersons.all()]
        return []


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
    kml_url = serializers.SerializerMethodField()

    class Meta:
        model = Plaque
        fields = [
            'id', 'code', 'name', 'city', 'latitude', 'longitude', 'radius_km',
            'boundary_geojson', 'kml_data', 'kml_url',
            'is_active', 'assigned_salespersons_details', 'enterprises', 'created_at'
        ]

    def get_kml_url(self, obj):
        return f"/api/sales/plaques/{obj.id}/kml/"

    def get_assigned_salespersons_details(self, obj):
        return [
            {"id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip() or u.username}
            for u in obj.assigned_salespersons.all()
        ]


class SalesNotificationSerializer(serializers.ModelSerializer):
    plaque_code = serializers.CharField(source='plaque.code', read_only=True, default='')
    plaque_name = serializers.CharField(source='plaque.name', read_only=True, default='')

    class Meta:
        model = SalesNotification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'plaque', 'plaque_code', 'plaque_name',
            'payload', 'is_read', 'created_at'
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


# ============================================================================
# FIELD INTELLIGENCE SERIALIZERS
# ============================================================================

from .models import NearbyLead, ReferralLead, TradeAudit, FieldIntelligenceReport, SalesIncentivePoint


class NearbyLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = NearbyLead
        fields = [
            'id', 'field_report', 'source_enterprise', 'name', 'sector',
            'manager_name', 'phone', 'proximity_notes', 'photo_url',
            'latitude', 'longitude', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'field_report', 'source_enterprise', 'created_at']


class ReferralLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralLead
        fields = [
            'id', 'field_report', 'source_enterprise', 'referral_type',
            'company_name', 'contact_person', 'phone', 'notes',
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'field_report', 'source_enterprise', 'created_at']


class TradeAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeAudit
        fields = [
            'id', 'field_report', 'enterprise', 'competitor_name',
            'satisfaction_score', 'friction_reasons', 'monthly_spend_estimated',
            'is_priority_friction_alert', 'alert_notes', 'created_at'
        ]
        read_only_fields = ['id', 'field_report', 'enterprise', 'is_priority_friction_alert', 'created_at']


class FieldIntelligenceReportSerializer(serializers.ModelSerializer):
    nearby_leads = NearbyLeadSerializer(many=True, required=False)
    referrals = ReferralLeadSerializer(many=True, required=False)
    trade_audits = TradeAuditSerializer(many=True, required=False)
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    salesperson_name = serializers.CharField(source='salesperson.username', read_only=True)

    class Meta:
        model = FieldIntelligenceReport
        fields = [
            'id', 'visit_report', 'enterprise', 'enterprise_name', 'salesperson', 'salesperson_name',
            'conversion_status', 'rccm_number', 'nurturing_reason', 'contract_expiry_date',
            'scheduled_follow_up', 'nurturing_notes', 'points_earned',
            'nearby_leads', 'referrals', 'trade_audits', 'created_at'
        ]
        read_only_fields = ['id', 'salesperson', 'points_earned', 'created_at']


class SalesIncentivePointSerializer(serializers.ModelSerializer):
    salesperson_name = serializers.CharField(source='salesperson.username', read_only=True)

    class Meta:
        model = SalesIncentivePoint
        fields = [
            'id', 'salesperson', 'salesperson_name', 'field_report',
            'action_type', 'points', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LeaderboardEntrySerializer(serializers.Serializer):
    salesperson_id = serializers.IntegerField()
    salesperson_name = serializers.CharField()
    full_name = serializers.CharField()
    total_points = serializers.IntegerField()
    successful_conversions_count = serializers.IntegerField()
    nearby_leads_count = serializers.IntegerField()
    referrals_count = serializers.IntegerField()
    trade_audits_count = serializers.IntegerField()
    rank = serializers.IntegerField()

