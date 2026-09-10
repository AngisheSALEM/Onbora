from rest_framework import serializers
from django.db import models
from accounts.models import User
from .models import (
    Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession,
    ScraperCredential, SalesNotification, VisitFormSubmission, SegmentationConfig,
    AdminDirective, SalesIncentivePoint
)


class SalespersonUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    assigned_plaques = serializers.SerializerMethodField()
    reports_count = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    visits_count = serializers.SerializerMethodField()
    form_submissions_count = serializers.SerializerMethodField()
    conversions_count = serializers.SerializerMethodField()
    converted_amount = serializers.SerializerMethodField()
    incentive_points = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'location', 'is_available', 'is_active', 'avatar',
            'assigned_plaques', 'reports_count', 'visits_count',
            'form_submissions_count', 'conversions_count', 'converted_amount', 'incentive_points'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_assigned_plaques(self, obj):
        return [p.code for p in obj.assigned_plaques.all()]

    def get_reports_count(self, obj):
        if 'reports_count_map' in self.context:
            return self.context['reports_count_map'].get(obj.id, 0)
        from .models import VisitReport
        return VisitReport.objects.filter(preparation__salesperson=obj).count()

    def get_avatar(self, obj):
        return getattr(obj, 'avatar', 'memoji_056.png') or 'memoji_056.png'

    def get_visits_count(self, obj):
        if 'visits_count_map' in self.context:
            return self.context['visits_count_map'].get(obj.id, 0)
        from .models import VisitReport
        return VisitReport.objects.filter(preparation__salesperson=obj).count()

    def get_form_submissions_count(self, obj):
        if 'submissions_count_map' in self.context:
            return self.context['submissions_count_map'].get(obj.id, 0)
        from .models import VisitFormSubmission
        return VisitFormSubmission.objects.filter(salesperson=obj).count()

    def get_conversions_count(self, obj):
        if 'conversions_count_map' in self.context:
            return self.context['conversions_count_map'].get(obj.id, 0)
        from .models import Enterprise
        return Enterprise.objects.filter(converted_by_user=obj, conversion_status='CONVERTED').count()

    def get_converted_amount(self, obj):
        if 'converted_amount_map' in self.context:
            return self.context['converted_amount_map'].get(obj.id, 0.0)
        from .models import Enterprise
        return float(Enterprise.objects.filter(converted_by_user=obj, conversion_status='CONVERTED').aggregate(total=models.Sum('converted_amount'))['total'] or 0.0)

    def get_incentive_points(self, obj):
        if 'incentive_points_map' in self.context:
            return self.context['incentive_points_map'].get(obj.id, 0)
        from .models import SalesIncentivePoint, Enterprise, VisitFormSubmission, VisitReport
        db_points = SalesIncentivePoint.objects.filter(salesperson=obj).aggregate(total=models.Sum('points'))['total'] or 0
        conversions = Enterprise.objects.filter(converted_by_user=obj, conversion_status='CONVERTED').count()
        submissions = VisitFormSubmission.objects.filter(salesperson=obj).count()
        visits = VisitReport.objects.filter(preparation__salesperson=obj).count()
        # Barème d'incentive terrain Onbora : 100 pts / compte converti, 20 pts / audit, 10 pts / visite
        calculated = (conversions * 100) + (submissions * 20) + (visits * 10)
        return max(db_points, calculated)


class AdminDirectiveSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)
    recipient_role = serializers.CharField(source='recipient.role', read_only=True)
    recipient_avatar = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    target_entity_display = serializers.CharField(source='get_target_entity_display', read_only=True)

    class Meta:
        model = AdminDirective
        fields = [
            'id', 'sender', 'sender_name', 'sender_username', 'sender_role', 'sender_avatar',
            'target_entity', 'target_entity_display',
            'recipient', 'recipient_name', 'recipient_username', 'recipient_role',
            'recipient_avatar', 'title', 'instruction', 'priority', 'priority_display',
            'status', 'status_display', 'target_account_name', 'acknowledgement_note',
            'created_at', 'updated_at'
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return "Super Administration"

    def get_sender_avatar(self, obj):
        if obj.sender:
            return getattr(obj.sender, 'avatar', 'memoji_056.png') or 'memoji_056.png'
        return 'memoji_056.png'

    def get_recipient_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.username
        return "Collaborateur"

    def get_recipient_avatar(self, obj):
        if obj.recipient:
            return getattr(obj.recipient, 'avatar', 'memoji_056.png') or 'memoji_056.png'
        return 'memoji_056.png'


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
        if 'total_enterprises_map' in self.context:
            return self.context['total_enterprises_map'].get(obj.id, 0)
        val = getattr(obj, 'total_enterprises', None)
        if val is not None and not callable(val):
            return val
        if hasattr(obj, 'enterprises'):
            return obj.enterprises.count()
        return 0

    def get_ready_count(self, obj):
        if 'ready_count_map' in self.context:
            return self.context['ready_count_map'].get(obj.id, 0)
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
    segment_display = serializers.CharField(source='get_segment_display', read_only=True)
    assigned_entity_display = serializers.CharField(source='get_assigned_entity_display', read_only=True)
    conversion_status_display = serializers.CharField(source='get_conversion_status_display', read_only=True)
    assigned_salesperson_name = serializers.SerializerMethodField()
    plaque_code = serializers.SerializerMethodField()

    class Meta:
        model = Enterprise
        fields = [
            'id', 'crm_id', 'name', 'website', 'sector', 'approximate_size', 'location',
            'city', 'commune', 'address', 'plaque', 'plaque_rel', 'plaque_code', 'latitude', 'longitude',
            'annual_revenue', 'employee_count', 'site_count',
            'rccm', 'id_nat', 'nif',
            'contact_name', 'contact_role', 'contact_phone', 'contact_email',
            'current_operator', 'current_connectivity',
            'segment', 'segment_display',
            'assigned_entity', 'assigned_entity_display',
            'assigned_kam', 'assigned_salesperson', 'assigned_salesperson_name',
            'is_visited', 'last_visited_at',
            'conversion_status', 'conversion_status_display',
            'converted_by_entity', 'converted_amount', 'converted_offer', 'converted_at',
            'conversion_notes',
            'scraping_status', 'scraped_data',
            'ai_hypotheses', 'ai_tailored_pitch', 'ai_key_questions', 'ai_potential_objections',
            'is_ready_for_conversion', 'conversion_score', 'recommended_solution',
            'existing_crm_data', 'siren', 'siret', 'kaabu_organization_id',
            'arrowsphere_tenant_id', 'sync_status', 'last_sync_date', 'created_at'
        ]

    def get_assigned_salesperson_name(self, obj):
        if obj.assigned_salesperson:
            return f"{obj.assigned_salesperson.first_name} {obj.assigned_salesperson.last_name}".strip() or obj.assigned_salesperson.username
        return None

    def get_plaque_code(self, obj):
        if obj.plaque_rel:
            return obj.plaque_rel.code
        return obj.plaque or ""


class EnterpriseCockpitSerializer(serializers.ModelSerializer):
    """
    Serializer allégé haute-performance pour le cockpit superviseur et la cartographie,
    sans les blobs JSON lourds (scraped_data, raw AI debates).
    """
    segment_display = serializers.CharField(source='get_segment_display', read_only=True)
    assigned_entity_display = serializers.CharField(source='get_assigned_entity_display', read_only=True)
    conversion_status_display = serializers.CharField(source='get_conversion_status_display', read_only=True)
    assigned_salesperson_name = serializers.SerializerMethodField()
    plaque_code = serializers.SerializerMethodField()

    class Meta:
        model = Enterprise
        fields = [
            'id', 'crm_id', 'name', 'website', 'sector', 'approximate_size', 'location',
            'city', 'commune', 'address', 'plaque', 'plaque_rel', 'plaque_code', 'latitude', 'longitude',
            'annual_revenue', 'employee_count', 'site_count',
            'rccm', 'id_nat', 'nif',
            'contact_name', 'contact_role', 'contact_phone', 'contact_email',
            'current_operator', 'current_connectivity',
            'segment', 'segment_display',
            'assigned_entity', 'assigned_entity_display',
            'assigned_kam', 'assigned_salesperson', 'assigned_salesperson_name',
            'is_visited', 'last_visited_at',
            'conversion_status', 'conversion_status_display',
            'converted_by_entity', 'converted_amount', 'converted_offer', 'converted_at',
            'is_ready_for_conversion', 'conversion_score', 'recommended_solution',
            'siren', 'siret', 'kaabu_organization_id',
            'arrowsphere_tenant_id', 'sync_status', 'last_sync_date', 'created_at'
        ]

    def get_assigned_salesperson_name(self, obj):
        if obj.assigned_salesperson:
            return f"{obj.assigned_salesperson.first_name} {obj.assigned_salesperson.last_name}".strip() or obj.assigned_salesperson.username
        return None

    def get_plaque_code(self, obj):
        if obj.plaque_rel:
            return obj.plaque_rel.code
        return obj.plaque or ""


class SegmentationConfigSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()

    class Meta:
        model = SegmentationConfig
        fields = [
            'id', 'tpe_max_revenue', 'pme_max_revenue',
            'backoffice_entity_label', 'kam_entity_label',
            'updated_at', 'stats'
        ]

    def get_stats(self, obj):
        from django.db.models import Count, Q
        agg = Enterprise.objects.aggregate(
            total=Count('id'),
            tpe=Count('id', filter=Q(segment='TPE_INFORMEL')),
            pme=Count('id', filter=Q(segment='PME')),
            gc=Count('id', filter=Q(segment='GRAND_COMPTE')),
            bo=Count('id', filter=Q(assigned_entity='BACK_OFFICE')),
            kam=Count('id', filter=Q(assigned_entity='KAM_OFFICE')),
            conv_bo=Count('id', filter=Q(conversion_status='CONVERTED', converted_by_entity='BACK_OFFICE')),
            conv_kam=Count('id', filter=Q(conversion_status='CONVERTED', converted_by_entity='KAM_OFFICE')),
        )
        
        return {
            'total_enterprises': agg['total'],
            'tpe_count': agg['tpe'],
            'pme_count': agg['pme'],
            'grand_compte_count': agg['gc'],
            'back_office_total': agg['bo'],
            'kam_office_total': agg['kam'],
            'converted_back_office': agg['conv_bo'],
            'converted_kam_office': agg['conv_kam'],
            'total_converted': agg['conv_bo'] + agg['conv_kam']
        }


class ConvertedAccountSerializer(serializers.ModelSerializer):
    segment_display = serializers.CharField(source='get_segment_display', read_only=True)
    converted_by_user_name = serializers.SerializerMethodField()

    class Meta:
        model = Enterprise
        fields = [
            'id', 'crm_id', 'name', 'sector', 'city', 'commune', 'address',
            'rccm', 'id_nat', 'nif', 'annual_revenue', 'employee_count',
            'segment', 'segment_display',
            'converted_by_entity', 'converted_amount', 'converted_offer',
            'converted_at', 'conversion_notes',
            'contact_name', 'contact_role', 'contact_phone', 'contact_email',
            'converted_by_user_name', 'current_operator', 'recommended_solution'
        ]

    def get_converted_by_user_name(self, obj):
        if obj.converted_by_user:
            return f"{obj.converted_by_user.first_name} {obj.converted_by_user.last_name}".strip() or obj.converted_by_user.username
        return "Agent Commercial Onbora"



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
    target_offer = serializers.CharField(required=False, default="")
    golden_questions = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    competitor_alert = serializers.CharField(required=False, default="")
    bant_status = serializers.CharField(required=False, default="QUALIFIED")
    bant_score = serializers.IntegerField(required=False, default=85)
    is_disqualified = serializers.BooleanField(required=False, default=False)
    disqualification_reason = serializers.CharField(required=False, allow_null=True, default=None)
    roi_pitch = serializers.CharField(required=False, default="")
    coi_estimated_monthly = serializers.FloatField(required=False, default=0.0)


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
    coaching_tip = serializers.CharField(required=False, default="")


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


class VisitFormSubmissionSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    salesperson_name = serializers.CharField(source='salesperson.username', read_only=True)

    class Meta:
        model = VisitFormSubmission
        fields = [
            'id', 'enterprise', 'enterprise_name', 'salesperson', 'salesperson_name',
            'questionnaire', 'target_offer_name', 'answers', 'ai_summary',
            'qualification_score', 'detected_needs', 'objections_noted',
            'next_action', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'salesperson', 'ai_summary', 'qualification_score', 'created_at']


class SubmitVisitFormRequestSerializer(serializers.Serializer):
    enterprise_id = serializers.IntegerField()
    questionnaire_id = serializers.IntegerField(required=False, allow_null=True)
    target_offer_name = serializers.CharField(required=False, default="Fibre Optique Pro Orange")
    answers = serializers.ListField(child=serializers.DictField())
    objections_noted = serializers.CharField(required=False, allow_blank=True, default='')
    custom_notes = serializers.CharField(required=False, allow_blank=True, default='')


