from django.contrib import admin
from .models import KamAppointment, KamVisitReport, PreCallBriefing


@admin.register(KamAppointment)
class KamAppointmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'enterprise', 'kam', 'meeting_type', 'scheduled_at', 'status']
    list_filter = ['meeting_type', 'status', 'kam']
    search_fields = ['title', 'enterprise__name', 'contact_name']


@admin.register(KamVisitReport)
class KamVisitReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'enterprise', 'kam', 'conversion_status', 'crm_sync_status', 'created_at']
    list_filter = ['conversion_status', 'crm_sync_status', 'kam']
    search_fields = ['enterprise__name', 'executive_summary']


@admin.register(PreCallBriefing)
class PreCallBriefingAdmin(admin.ModelAdmin):
    list_display = ['enterprise', 'kam', 'updated_at']
    list_filter = ['kam']
    search_fields = ['enterprise__name']
