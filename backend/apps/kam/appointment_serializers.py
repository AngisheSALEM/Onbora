from rest_framework import serializers

from .models import KamAppointment


class KamAppointmentUpdateSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.IntegerField(min_value=1, max_value=480)

    class Meta:
        model = KamAppointment
        fields = (
            'title', 'meeting_type', 'scheduled_at', 'duration_minutes',
            'location', 'meet_url', 'contact_name', 'contact_role',
            'objective', 'visit_purpose', 'status',
        )

    def update(self, instance, validated_data):
        if 'visit_purpose' in validated_data:
            instance.purpose_source = 'MANUAL'
            instance.purpose_reason = 'Choix du KAM.'
        return super().update(instance, validated_data)
