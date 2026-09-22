from django.contrib import admin
from .models import KamAppointment, KamVisitReport, PreCallBriefing, ProspectDossier, RelationshipCoverage


@admin.register(ProspectDossier)
class ProspectDossierAdmin(admin.ModelAdmin):
    list_display = ['id', 'contact_name', 'source', 'status', 'kam', 'created_at']
    list_select_related = ['kam', 'conversation', 'visit_report']
    list_filter = ['source', 'status', 'kam']
    search_fields = ['contact_name', 'phone', 'rccm']


@admin.register(KamAppointment)
class KamAppointmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'enterprise', 'kam', 'meeting_type', 'scheduled_at', 'status']
    list_select_related = ['enterprise', 'kam']
    list_filter = ['meeting_type', 'status', 'kam']
    search_fields = ['title', 'enterprise__name', 'contact_name']


@admin.register(KamVisitReport)
class KamVisitReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'enterprise', 'kam', 'conversion_status', 'crm_sync_status', 'created_at']
    list_select_related = ['enterprise', 'kam']
    list_filter = ['conversion_status', 'crm_sync_status', 'kam']
    search_fields = ['enterprise__name', 'executive_summary']


@admin.register(PreCallBriefing)
class PreCallBriefingAdmin(admin.ModelAdmin):
    list_display = ['enterprise', 'kam', 'updated_at']
    list_select_related = ['enterprise', 'kam']
    list_filter = ['kam']
    search_fields = ['enterprise__name']


@admin.register(RelationshipCoverage)
class RelationshipCoverageAdmin(admin.ModelAdmin):
    list_display = [
        'contact_name', 'enterprise', 'role_classification',
        'influence_level', 'coverage_status', 'is_mono_champion_risk', 'last_interaction_at'
    ]
    list_select_related = ['enterprise', 'last_interaction_proof']
    list_filter = ['role_classification', 'influence_level', 'coverage_status', 'is_mono_champion_risk']
    search_fields = ['contact_name', 'contact_role', 'contact_email', 'enterprise__name']


from .models import SyncOperation

@admin.register(SyncOperation)
class SyncOperationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'target_system', 'entity_type', 'entity_id',
        'operation', 'status', 'retry_count', 'remote_id', 'scheduled_at', 'completed_at'
    ]
    list_filter = ['target_system', 'entity_type', 'status']
    search_fields = ['entity_id', 'remote_id', 'last_error']
    ordering = ['-created_at']


