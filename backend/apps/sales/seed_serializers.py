"""Input contract shared with the standalone Onbora Analysis seed."""
import hashlib

from rest_framework import serializers


class SeedContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)


class SeedOriginSerializer(serializers.Serializer):
    instance = serializers.CharField(max_length=256)
    company_id = serializers.UUIDField(required=False)
    source_ref = serializers.CharField(max_length=512)


class SeedRecordSerializer(serializers.Serializer):
    external_id = serializers.RegexField(r'^[a-zA-Z0-9_-]{1,100}$')
    kind = serializers.ChoiceField(choices=['company', 'lead'])
    source = serializers.ChoiceField(choices=['fictional', 'onbora'])
    is_fictitious = serializers.BooleanField()
    name = serializers.CharField(max_length=1000)
    sector = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    province = serializers.CharField(max_length=256, required=False, allow_blank=True)
    address = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    website = serializers.URLField(max_length=2048, required=False, allow_blank=True)
    identifiers = serializers.DictField(child=serializers.CharField(max_length=256), required=False)
    sources = serializers.ListField(child=serializers.JSONField(), max_length=1000, required=False)
    contacts = SeedContactSerializer(many=True, required=False)
    onbora = SeedOriginSerializer(required=False)
    status = serializers.ChoiceField(choices=['new', 'prospect', 'qualified', 'customer'], required=False)
    assigned_kam_username = serializers.CharField(max_length=150, required=False)

    def validate(self, attrs):
        if attrs['kind'] == 'lead':
            origin = attrs.get('onbora')
            if attrs['source'] != 'onbora' or attrs['is_fictitious'] or not origin:
                raise serializers.ValidationError('Provenance du lead invalide.')
            key = hashlib.sha256((origin['instance'] + '\0' + origin['source_ref']).encode()).hexdigest()
            if attrs['external_id'] != 'onbora-' + key:
                raise serializers.ValidationError('Identité du lead incompatible avec sa provenance.')
            if attrs.get('contacts'):
                raise serializers.ValidationError('Les contacts du registre doivent rester vides.')
        elif attrs['source'] != 'fictional' or not attrs['is_fictitious'] or 'onbora' in attrs:
            raise serializers.ValidationError('Provenance de l’entreprise invalide.')
        return attrs
