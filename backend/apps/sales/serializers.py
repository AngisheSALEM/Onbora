from decimal import Decimal

from rest_framework import serializers
from django.db import models
from accounts.models import User
from .models import (
    Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession,
    ScraperCredential, SalesNotification, VisitFormSubmission, SegmentationConfig,
    SalesIncentivePoint, AccountProjection, AccountPortfolioAssignment,
    SourceObservation, Evidence
)


def _fetch_salesperson_fallback_stats(salesperson_id: int) -> dict:
    from .models import VisitReport, VisitFormSubmission, Enterprise, SalesIncentivePoint
    reports_count = VisitReport.objects.filter(preparation__salesperson_id=salesperson_id).count()
    submissions_count = VisitFormSubmission.objects.filter(salesperson_id=salesperson_id).count()
    conversions_qs = Enterprise.objects.filter(converted_by_user_id=salesperson_id, conversion_status='CONVERTED')
    conversions_count = conversions_qs.count()
    converted_amount = float(conversions_qs.aggregate(total=models.Sum('converted_amount'))['total'] or 0.0)
    db_points = SalesIncentivePoint.objects.filter(salesperson_id=salesperson_id).aggregate(total=models.Sum('points'))['total'] or 0
    calculated_pts = (conversions_count * 100) + (submissions_count * 20) + (reports_count * 10)
    return {
        'reports_count': reports_count,
        'visits_count': reports_count,
        'submissions_count': submissions_count,
        'conversions_count': conversions_count,
        'converted_amount': converted_amount,
        'incentive_points': max(db_points, calculated_pts),
    }


class SalespersonSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    assigned_plaques = serializers.SerializerMethodField()
    reports_count = serializers.SerializerMethodField()
    visits_count = serializers.SerializerMethodField()
    form_submissions_count = serializers.SerializerMethodField()
    conversions_count = serializers.SerializerMethodField()
    converted_amount = serializers.SerializerMethodField()
    incentive_points = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email', 'avatar',
            'assigned_plaques', 'reports_count', 'visits_count',
            'form_submissions_count', 'conversions_count',
            'converted_amount', 'incentive_points', 'is_available'
        ]

    def _get_stats(self, obj):
        if not hasattr(obj, '_cached_sales_stats'):
            obj._cached_sales_stats = _fetch_salesperson_fallback_stats(obj.id)
        return obj._cached_sales_stats

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_assigned_plaques(self, obj):
        return [p.code for p in obj.assigned_plaques.all()]

    def get_avatar(self, obj):
        return getattr(obj, 'avatar', 'memoji_056.png') or 'memoji_056.png'

    def get_reports_count(self, obj):
        if 'reports_count_map' in self.context:
            return self.context['reports_count_map'].get(obj.id, 0)
        return self._get_stats(obj)['reports_count']

    def get_visits_count(self, obj):
        if 'visits_count_map' in self.context:
            return self.context['visits_count_map'].get(obj.id, 0)
        return self._get_stats(obj)['visits_count']

    def get_form_submissions_count(self, obj):
        if 'submissions_count_map' in self.context:
            return self.context['submissions_count_map'].get(obj.id, 0)
        return self._get_stats(obj)['submissions_count']

    def get_conversions_count(self, obj):
        if 'conversions_count_map' in self.context:
            return self.context['conversions_count_map'].get(obj.id, 0)
        return self._get_stats(obj)['conversions_count']

    def get_converted_amount(self, obj):
        if 'converted_amount_map' in self.context:
            return self.context['converted_amount_map'].get(obj.id, 0.0)
        return self._get_stats(obj)['converted_amount']

    def get_incentive_points(self, obj):
        if 'incentive_points_map' in self.context:
            return self.context['incentive_points_map'].get(obj.id, 0)
        return self._get_stats(obj)['incentive_points']


SalespersonUserSerializer = SalespersonSerializer





class PlaqueSerializer(serializers.ModelSerializer):
    total_enterprises = serializers.SerializerMethodField()
    ready_count = serializers.SerializerMethodField()
    assigned_salespersons_names = serializers.SerializerMethodField()
    assigned_salespersons = serializers.SerializerMethodField()
    is_assigned = serializers.SerializerMethodField()
    kml_url = serializers.SerializerMethodField()

    class Meta:
        model = Plaque
        fields = [
            'id', 'code', 'name', 'city', 'latitude', 'longitude', 'radius_km',
            'boundary_geojson', 'kml_data', 'kml_url',
            'is_active', 'total_enterprises', 'ready_count', 'assigned_salespersons', 'assigned_salespersons_names', 'is_assigned', 'created_at'
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

    def get_is_assigned(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user and request.user.is_authenticated:
            val = getattr(obj, 'assigned_salespersons', None)
            if isinstance(val, list):
                return request.user.id in val
            if hasattr(val, 'filter'):
                return val.filter(pk=request.user.pk).exists()
        return False


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
            'current_connectivity',
            'contract_end_date', 'incident_count', 'budget_status', 'pain_level', 'telecom_budget_monthly',
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
            'ai_lead_scoring_data', 'ai_churn_data', 'ai_scored_at',
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


class AdminEnterpriseCreateSerializer(serializers.ModelSerializer):
    """Creation payload deliberately limited to administrator-managed CRM fields."""

    annual_revenue = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=Decimal('0.00'),
    )
    employee_count = serializers.IntegerField(min_value=1)

    class Meta:
        model = Enterprise
        fields = [
            'name', 'crm_id', 'sector', 'website',
            'city', 'commune', 'address',
            'annual_revenue', 'employee_count',
            'contact_name', 'contact_role', 'contact_phone', 'contact_email',
            'current_connectivity',
        ]
        extra_kwargs = {
            'name': {'trim_whitespace': True},
            'crm_id': {'required': False, 'allow_blank': True, 'allow_null': True},
            'sector': {'required': True, 'allow_blank': False},
            'website': {'required': False, 'allow_blank': True, 'allow_null': True},
            'city': {'required': False, 'allow_blank': False},
            'commune': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
            'contact_name': {'required': False, 'allow_blank': True},
            'contact_role': {'required': False, 'allow_blank': True},
            'contact_phone': {'required': False, 'allow_blank': True},
            'contact_email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'current_connectivity': {'required': False, 'allow_blank': True},
        }

    def validate_crm_id(self, value):
        crm_id = (value or '').strip()
        if not crm_id:
            return None
        if Enterprise.objects.filter(crm_id__iexact=crm_id).exists():
            raise serializers.ValidationError("Cet identifiant CRM est déjà utilisé.")
        return crm_id

    def create(self, validated_data):
        config = SegmentationConfig.get_active()
        annual_revenue = validated_data['annual_revenue']

        if annual_revenue < config.tpe_max_revenue:
            segment = 'TPE_INFORMEL'
            assigned_entity = 'BACK_OFFICE'
        elif annual_revenue < config.pme_max_revenue:
            segment = 'PME'
            assigned_entity = 'KAM_OFFICE'
        else:
            segment = 'GRAND_COMPTE'
            assigned_entity = 'KAM_OFFICE'

        return Enterprise.objects.create(
            **validated_data,
            segment=segment,
            assigned_entity=assigned_entity,
        )


class EnterpriseCockpitSerializer(serializers.ModelSerializer):
    """
    Serializer allégé haute-performance pour le cockpit superviseur et la cartographie,
    sans les blobs JSON lourds (scraped_data, raw AI debates).
    """
    segment_display = serializers.CharField(source='get_segment_display', read_only=True)
    assigned_entity_display = serializers.CharField(source='get_assigned_entity_display', read_only=True)
    conversion_status_display = serializers.CharField(source='get_conversion_status_display', read_only=True)
    assigned_salesperson_name = serializers.SerializerMethodField()
    last_visited_by_name = serializers.SerializerMethodField()
    plaque_code = serializers.SerializerMethodField()

    class Meta:
        model = Enterprise
        fields = [
            'id', 'crm_id', 'name', 'website', 'sector', 'approximate_size', 'location',
            'city', 'commune', 'address', 'plaque', 'plaque_rel', 'plaque_code', 'latitude', 'longitude',
            'annual_revenue', 'employee_count', 'site_count',
            'rccm', 'id_nat', 'nif',
            'contact_name', 'contact_role', 'contact_phone', 'contact_email',
            'current_connectivity',
            'contract_end_date', 'incident_count', 'budget_status', 'pain_level', 'telecom_budget_monthly',
            'segment', 'segment_display',
            'assigned_entity', 'assigned_entity_display',
            'assigned_kam', 'assigned_salesperson', 'assigned_salesperson_name',
            'is_visited', 'last_visited_at', 'last_visited_by', 'last_visited_by_name',
            'conversion_status', 'conversion_status_display',
            'converted_by_entity', 'converted_amount', 'converted_offer', 'converted_at',
            'is_ready_for_conversion', 'conversion_score', 'recommended_solution',
            'ai_scored_at',
            'siren', 'siret', 'kaabu_organization_id',
            'arrowsphere_tenant_id', 'sync_status', 'last_sync_date', 'created_at'
        ]

    def get_assigned_salesperson_name(self, obj):
        if obj.assigned_salesperson:
            return f"{obj.assigned_salesperson.first_name} {obj.assigned_salesperson.last_name}".strip() or obj.assigned_salesperson.username
        return None

    def get_last_visited_by_name(self, obj):
        if obj.last_visited_by:
            return f"{obj.last_visited_by.first_name} {obj.last_visited_by.last_name}".strip() or obj.last_visited_by.username
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
            'converted_by_user_name', 'recommended_solution'
        ]

    def get_converted_by_user_name(self, obj):
        if obj.converted_by_user:
            return f"{obj.converted_by_user.first_name} {obj.converted_by_user.last_name}".strip() or obj.converted_by_user.username
        return "Agent Commercial Onbora"



class PlaqueDetailSerializer(serializers.ModelSerializer):
    enterprises = serializers.SerializerMethodField()
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

    def get_enterprises(self, obj):
        request = self.context.get('request')
        qs = obj.enterprises.all()
        if request and hasattr(request, 'user') and request.user.is_authenticated and getattr(request.user, 'role', None) == 'SALESPERSON':
            qs = qs.filter(assigned_entity='BACK_OFFICE').filter(
                models.Q(assigned_salesperson=request.user) | models.Q(assigned_salesperson__isnull=True)
            ).order_by(
                models.Case(
                    models.When(assigned_salesperson=request.user, then=models.Value(0)),
                    default=models.Value(1),
                    output_field=models.IntegerField(),
                ),
                '-is_ready_for_conversion',
                '-conversion_score'
            )
        else:
            qs = qs.order_by('-annual_revenue')
        return EnterpriseSerializer(qs, many=True, context=self.context).data


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
    bant_score = serializers.SerializerMethodField()
    coi_metrics = serializers.SerializerMethodField()
    tiered_packages = serializers.SerializerMethodField()
    email_j1 = serializers.SerializerMethodField()
    email_j4 = serializers.SerializerMethodField()
    technical_handover_specs = serializers.SerializerMethodField()
    processing_time_seconds = serializers.SerializerMethodField()

    class Meta:
        model = VisitReport
        fields = [
            'id', 'preparation', 'preparation_details', 'raw_transcript', 'executive_summary',
            'confirmed_needs', 'objections_raised', 'actions_todo', 'follow_up_email_draft',
            'audio_file_path', 'original_ai_output',
            'bant_score', 'coi_metrics', 'tiered_packages', 'email_j1', 'email_j4', 'technical_handover_specs',
            'processing_time_seconds',
            'ai_feedback_rating', 'ai_feedback_comments',
            'ai_feedback_sent_at', 'has_dossier', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_has_dossier(self, obj):
        return obj.dossiers.exists()

    def get_bant_score(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('bant')
        return None

    def get_coi_metrics(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('coi')
        return None

    def get_tiered_packages(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('packages', [])
        return []

    def get_email_j1(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('email_j1', obj.follow_up_email_draft)
        return obj.follow_up_email_draft

    def get_email_j4(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('email_j4', '')
        return ''

    def get_technical_handover_specs(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('technical_handover_specs', {})
        return {}

    def get_processing_time_seconds(self, obj):
        if isinstance(obj.original_ai_output, dict):
            return obj.original_ai_output.get('processing_time_seconds')
        return None


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
    enterprise_sector = serializers.CharField(source='enterprise.sector', read_only=True)
    enterprise_commune = serializers.CharField(source='enterprise.commune', read_only=True)
    plaque_code = serializers.SerializerMethodField()
    salesperson_name = serializers.SerializerMethodField()

    class Meta:
        model = VisitFormSubmission
        fields = [
            'id', 'enterprise', 'enterprise_name', 'enterprise_sector', 'enterprise_commune', 'plaque_code',
            'salesperson', 'salesperson_name',
            'questionnaire', 'target_offer_name', 'answers', 'ai_summary',
            'qualification_score', 'detected_needs', 'objections_noted',
            'next_action', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'salesperson', 'ai_summary', 'qualification_score', 'created_at']

    def get_salesperson_name(self, obj):
        if obj.salesperson:
            return f"{obj.salesperson.first_name} {obj.salesperson.last_name}".strip() or obj.salesperson.username
        return "Commercial Terrain"

    def get_plaque_code(self, obj):
        if obj.enterprise and obj.enterprise.plaque_rel:
            return obj.enterprise.plaque_rel.code
        return (obj.enterprise.plaque if obj.enterprise else "") or ""


class SubmitVisitFormRequestSerializer(serializers.Serializer):
    enterprise_id = serializers.IntegerField()
    questionnaire_id = serializers.IntegerField(required=False, allow_null=True)
    target_offer_name = serializers.CharField(required=False, default="Fibre Optique Pro Orange")
    answers = serializers.ListField(child=serializers.DictField())
    objections_noted = serializers.CharField(required=False, allow_blank=True, default='')
    custom_notes = serializers.CharField(required=False, allow_blank=True, default='')


class AccountProjectionSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    source_system_display = serializers.CharField(source='get_source_system_display', read_only=True)
    sync_status_display = serializers.CharField(source='get_sync_status_display', read_only=True)

    class Meta:
        model = AccountProjection
        fields = [
            'id', 'enterprise', 'enterprise_name', 'crm_account_id',
            'source_system', 'source_system_display', 'source_version',
            'raw_crm_payload', 'last_pulled_at', 'last_pushed_at',
            'sync_status', 'sync_status_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AccountPortfolioAssignmentSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    user_name = serializers.ReadOnlyField(source='user.get_full_name')
    user_email = serializers.ReadOnlyField(source='user.email')
    assignment_type_display = serializers.CharField(source='get_assignment_type_display', read_only=True)

    class Meta:
        model = AccountPortfolioAssignment
        fields = [
            'id', 'enterprise', 'enterprise_name', 'user', 'user_name',
            'user_email', 'assignment_type', 'assignment_type_display',
            'assigned_at', 'assigned_by', 'is_active', 'notes'
        ]
        read_only_fields = ['id', 'assigned_at']


class SourceObservationSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    captured_by_name = serializers.ReadOnlyField(source='captured_by.get_full_name')

    class Meta:
        model = SourceObservation
        fields = [
            'id', 'enterprise', 'enterprise_name', 'source_type',
            'source_type_display', 'source_uri', 'source_title',
            'observed_at', 'captured_at', 'excerpt_text', 'excerpt_hash',
            'status', 'status_display', 'captured_by', 'captured_by_name'
        ]
        read_only_fields = ['id', 'captured_at', 'excerpt_hash']


class EvidenceSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    review_status_display = serializers.CharField(source='get_review_status_display', read_only=True)
    reviewed_by_name = serializers.ReadOnlyField(source='reviewed_by.get_full_name')

    class Meta:
        model = Evidence
        fields = [
            'id', 'enterprise', 'enterprise_name', 'observation', 'kind',
            'kind_display', 'category', 'statement', 'confidence_score',
            'review_status', 'review_status_display', 'reviewed_by',
            'reviewed_by_name', 'reviewed_at', 'valid_from', 'valid_until',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']



