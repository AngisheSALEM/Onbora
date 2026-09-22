from rest_framework import serializers
from .models import ClientConversation, ClientConversationMessage, QualificationRecord, HandoffDossier


class ClientConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientConversationMessage
        fields = ['id', 'sender', 'content', 'created_at']


class ClientConversationSerializer(serializers.ModelSerializer):
    messages = ClientConversationMessageSerializer(many=True, read_only=True)
    dossier_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientConversation
        fields = ['id', 'client', 'status', 'channel', 'extracted_profile', 'messages', 'dossier_details', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'status', 'extracted_profile', 'created_at', 'updated_at']

    def get_dossier_details(self, obj):
        dossier = obj.dossiers.first()
        if dossier:
            from kam.serializers import ProspectDossierSerializer
            return ProspectDossierSerializer(dossier).data
        return None


# ============================================================================
# EPIC 2 SERIALIZERS : QUALIFICATION DOUBLE SEGMENT & HANDOFF
# ============================================================================

class QualificationRecordSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    conducted_by_name = serializers.CharField(source='conducted_by.username', read_only=True, default='')

    class Meta:
        model = QualificationRecord
        fields = [
            'id', 'enterprise', 'enterprise_name', 'conducted_by', 'conducted_by_name',
            'initial_segment', 'effective_segment', 'pivot_triggered', 'pivot_reason',
            'completeness_score', 'answers', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HandoffDossierSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    enterprise_sector = serializers.CharField(source='enterprise.sector', read_only=True, default='')
    from_user_name = serializers.CharField(source='from_user.username', read_only=True)
    to_kam_name = serializers.CharField(source='to_kam.username', read_only=True, default='')
    qualification_details = QualificationRecordSerializer(source='qualification', read_only=True)

    class Meta:
        model = HandoffDossier
        fields = [
            'id', 'enterprise', 'enterprise_name', 'enterprise_sector',
            'qualification', 'qualification_details',
            'from_user', 'from_user_name', 'from_role',
            'to_kam', 'to_kam_name', 'target_segment',
            'status', 'transfer_notes', 'return_reason',
            'transferred_at', 'decided_at', 'decided_by'
        ]
        read_only_fields = ['id', 'transferred_at', 'decided_at', 'decided_by']


class QualificationSubmissionSerializer(serializers.Serializer):
    enterprise_id = serializers.IntegerField(required=True)
    answers = serializers.DictField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class HandoffDecisionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    return_reason = serializers.CharField(required=False, allow_blank=True, default='')
