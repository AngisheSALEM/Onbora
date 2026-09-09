from django.contrib import admin
from .models import (
    Enterprise,
    Plaque,
    SegmentationConfig,
    VisitPreparation,
    VisitReport,
    VisitFormSubmission,
    SalesNotification,
    LiveVisitSession
)


@admin.register(Plaque)
class PlaqueAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'city', 'latitude', 'longitude', 'radius_km', 'is_active', 'created_at']
    list_filter = ['city', 'is_active']
    search_fields = ['code', 'name', 'city']
    ordering = ['code']


@admin.register(SegmentationConfig)
class SegmentationConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'tpe_max_revenue', 'pme_max_revenue', 'backoffice_entity_label', 'kam_entity_label']


@admin.register(Enterprise)
class EnterpriseAdmin(admin.ModelAdmin):
    list_display = ['crm_id', 'name', 'segment', 'assigned_entity', 'assigned_kam', 'annual_revenue', 'city', 'plaque', 'conversion_status']
    list_filter = ['segment', 'assigned_entity', 'conversion_status', 'city']
    search_fields = ['crm_id', 'name', 'rccm', 'contact_name', 'city', 'sector']
    list_per_page = 50
    ordering = ['crm_id']


@admin.register(VisitFormSubmission)
class VisitFormSubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'enterprise', 'target_offer_name', 'salesperson', 'qualification_score', 'status', 'created_at']
    list_filter = ['status', 'target_offer_name', 'salesperson']
    search_fields = ['enterprise__name', 'target_offer_name', 'ai_summary']
    list_per_page = 50


@admin.register(VisitPreparation)
class VisitPreparationAdmin(admin.ModelAdmin):
    list_display = ['id', 'enterprise', 'salesperson', 'meeting_objective', 'scheduled_date']
    list_filter = ['salesperson']
    search_fields = ['enterprise__name']


@admin.register(VisitReport)
class VisitReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'preparation', 'created_at']
    search_fields = ['preparation__enterprise__name']


@admin.register(SalesNotification)
class SalesNotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['title', 'body', 'recipient__username']


@admin.register(LiveVisitSession)
class LiveVisitSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'salesperson', 'enterprise', 'session_status', 'created_at']
    list_filter = ['session_status']
