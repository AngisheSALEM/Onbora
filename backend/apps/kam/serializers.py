from rest_framework import serializers
from .models import ProspectDossier, RelationshipCoverage
from accounts.serializers import UserSerializer
from twin.models import BusinessTwin

class BusinessTwinSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessTwin
        fields = ['id', 'current_state', 'proposed_state', 'recommended_services', 'roadmap', 'created_at']

class ProspectDossierSerializer(serializers.ModelSerializer):
    kam_details = UserSerializer(source='kam', read_only=True)
    company_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    details_summary = serializers.SerializerMethodField()
    has_twin = serializers.SerializerMethodField()
    recommendations = serializers.SerializerMethodField()

    class Meta:
        model = ProspectDossier
        fields = [
            'id', 'source', 'conversation', 'visit_report', 'kam', 'kam_details',
            'status', 'raw_conversation_data', 'internal_kam_notes',
            'company_name', 'contact_name', 'email', 'phone', 'rccm', 
            'billing_address', 'is_complete', 'details_summary',
            'has_twin', 'recommendations', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'source', 'conversation', 'visit_report', 'created_at', 'updated_at']

    def get_company_name(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            profile = obj.conversation.extracted_profile or {}
            client = obj.conversation.client
            return profile.get('company_name') or (client.company_name if client else None) or "Entreprise Inconnue (Inbound)"
        elif obj.source == ProspectDossier.OUTBOUND_VISIT and obj.visit_report:
            return obj.visit_report.preparation.enterprise.name
        return "Entreprise Inconnue"

    def get_email(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation and obj.conversation.client:
            return obj.conversation.client.email
        return None

    def get_details_summary(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            profile = obj.conversation.extracted_profile or {}
            problems = profile.get('current_problems', [])
            return f"Besoins qualifiés : {', '.join(problems)}" if problems else "Aucun problème spécifique qualifié."
        elif obj.source == ProspectDossier.OUTBOUND_VISIT and obj.visit_report:
            return obj.visit_report.executive_summary
        return ""

    def get_has_twin(self, obj):
        return hasattr(obj, 'business_twin')

    def get_recommendations(self, obj):
        try:
            return obj.business_twin.recommended_services
        except:
            return []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Fallback for contact_name if empty
        if not data.get('contact_name'):
            if instance.source == ProspectDossier.INBOUND_CONVERSATION and instance.conversation:
                client = instance.conversation.client
                if client:
                    data['contact_name'] = f"{client.first_name} {client.last_name}".strip() or client.username
                else:
                    data['contact_name'] = "Visiteur Anonyme"
            elif instance.source == ProspectDossier.OUTBOUND_VISIT and instance.visit_report:
                prep = instance.visit_report.preparation
                data['contact_name'] = f"Commercial: {prep.salesperson.first_name} {prep.salesperson.last_name}".strip() or prep.salesperson.username
            else:
                data['contact_name'] = "Contact Inconnu"
                
        # Fallback for phone if empty
        if not data.get('phone'):
            if instance.source == ProspectDossier.INBOUND_CONVERSATION and instance.conversation:
                profile = instance.conversation.extracted_profile or {}
                client = instance.conversation.client
                data['phone'] = profile.get('phone') or (client.phone if client else None)
        return data


class RelationshipCoverageSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    role_classification_display = serializers.CharField(source='get_role_classification_display', read_only=True)
    influence_level_display = serializers.CharField(source='get_influence_level_display', read_only=True)
    coverage_status_display = serializers.CharField(source='get_coverage_status_display', read_only=True)

    class Meta:
        model = RelationshipCoverage
        fields = [
            'id', 'enterprise', 'enterprise_name', 'contact_name', 'contact_role',
            'contact_email', 'contact_phone', 'role_classification',
            'role_classification_display', 'influence_level', 'influence_level_display',
            'coverage_status', 'coverage_status_display', 'is_mono_champion_risk',
            'last_interaction_at', 'last_interaction_proof', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


from .models import AccountMemoryEvent

class AccountMemoryEventSerializer(serializers.ModelSerializer):
    enterprise_name = serializers.ReadOnlyField(source='enterprise.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = AccountMemoryEvent
        fields = [
            'id', 'enterprise', 'enterprise_name', 'event_type', 'event_type_display',
            'summary', 'details', 'occurred_at', 'created_by', 'created_by_name',
            'evidence', 'is_critical', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


