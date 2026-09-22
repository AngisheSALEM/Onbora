from django.contrib import admin
from .models import QualificationRecord, HandoffDossier


@admin.register(QualificationRecord)
class QualificationRecordAdmin(admin.ModelAdmin):
    list_display = [
        'enterprise', 'initial_segment', 'effective_segment',
        'pivot_triggered', 'completeness_score', 'status', 'conducted_by', 'created_at'
    ]
    list_filter = ['initial_segment', 'effective_segment', 'pivot_triggered', 'status']
    search_fields = ['enterprise__name', 'pivot_reason']
    ordering = ['-created_at']


@admin.register(HandoffDossier)
class HandoffDossierAdmin(admin.ModelAdmin):
    list_display = [
        'enterprise', 'target_segment', 'status',
        'from_user', 'from_role', 'to_kam', 'transferred_at', 'decided_at'
    ]
    list_filter = ['target_segment', 'status', 'from_role']
    search_fields = ['enterprise__name', 'transfer_notes', 'return_reason']
    ordering = ['-transferred_at']
