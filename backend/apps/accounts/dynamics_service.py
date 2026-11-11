"""Configuration Dynamics de l'instance MSP (déploiement dédié)."""
import base64
import hashlib
import re
from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import DynamicsConnection


class DynamicsInput(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    client_id = serializers.UUIDField()
    resource_url = serializers.URLField(max_length=200)
    client_secret = serializers.CharField(max_length=4096, required=False, trim_whitespace=False, write_only=True)
    auto_import_enabled = serializers.BooleanField(required=False)
    import_interval_minutes = serializers.IntegerField(min_value=5, max_value=1440, required=False)

    def validate_resource_url(self, value):
        url = urlsplit(value)
        # Seuls les domaines Dynamics publics : aucune URL interne, redirection ou port libre.
        if (url.scheme != 'https' or url.port not in (None, 443) or url.username or url.password
                or url.query or url.fragment or url.path not in ('', '/')
                or not re.fullmatch(r'[a-z0-9-]+\.crm\d*\.dynamics\.com', url.hostname or '')):
            raise serializers.ValidationError("Utilisez l'URL HTTPS de votre environnement Dynamics 365.")
        return f'https://{url.hostname}'


def _cipher():
    material = getattr(settings, 'CRM_CREDENTIALS_KEY', '') or settings.SECRET_KEY
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(material.encode()).digest()))


class DynamicsConnectionService:
    @staticmethod
    def describe():
        config = DynamicsConnection.objects.filter(pk=1).first()
        if not config:
            return {'configured': False, 'verified_at': None}
        return {
            'configured': True, 'tenant_id': str(config.tenant_id),
            'client_id': str(config.client_id), 'resource_url': config.resource_url,
            'verified_at': config.verified_at, 'has_secret': bool(config.encrypted_secret),
            'auto_import_enabled': config.auto_import_enabled,
            'import_interval_minutes': config.import_interval_minutes,
            'next_import_at': config.next_import_at,
        }

    @staticmethod
    @transaction.atomic
    def save(data):
        serializer = DynamicsInput(data=data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        config = DynamicsConnection.objects.select_for_update().filter(pk=1).first()
        secret = values.pop('client_secret', '')
        if not secret and not config:
            raise serializers.ValidationError({'detail': 'Renseignez le secret client Microsoft Entra.'})
        encrypted = _cipher().encrypt(secret.encode()).decode() if secret else config.encrypted_secret
        DynamicsConnection.objects.update_or_create(pk=1, defaults={
            **values, 'encrypted_secret': encrypted, 'verified_at': None,
            'import_mapping': {}, 'next_import_at': None,
        })
        return DynamicsConnectionService.describe()

    @staticmethod
    def client():
        from kam.integrations.dynamics.client import DataverseClient, DataverseClientException
        config = DynamicsConnection.objects.filter(pk=1).first()
        if not config:
            raise DataverseClientException('Configurez la connexion Dynamics 365 dans les paramètres administrateur.')
        try:
            secret = _cipher().decrypt(config.encrypted_secret.encode()).decode()
        except InvalidToken:
            raise DataverseClientException('Le secret enregistré est illisible. Enregistrez un nouveau secret.') from None
        return DataverseClient(
            tenant_id=str(config.tenant_id), client_id=str(config.client_id),
            client_secret=secret, resource_url=config.resource_url, simulation_mode=False,
        )

    @staticmethod
    def test():
        client = DynamicsConnectionService.client()
        config = DynamicsConnection.objects.get(pk=1)
        result = client.check_connection()
        if not result.get('UserId'):
            from kam.integrations.dynamics.client import DataverseClientException
            raise DataverseClientException('La connexion Dynamics ne renvoie aucun utilisateur autorisé.')
        DynamicsConnection.objects.filter(pk=1, updated_at=config.updated_at).update(verified_at=timezone.now())
        return DynamicsConnectionService.describe()
