from unittest.mock import patch
from django.test import override_settings
from rest_framework.test import APITestCase
from accounts.models import User, DynamicsConnection
from accounts.dynamics_service import DynamicsConnectionService
from kam.integrations.dynamics.client import DataverseClientException
from kam.integrations.dynamics.worker import DynamicsOutboxWorker
from kam.models import SyncOperation


@override_settings(SECRET_KEY='test-only-secret-key')
class DynamicsConnectionTests(APITestCase):
    url = '/api/accounts/integrations/dynamics/'

    def setUp(self):
        self.admin = User.objects.create_user(username='crm-admin', role=User.ADMIN)
        self.client.force_authenticate(self.admin)
        self.data = {
            'tenant_id': '11111111-1111-1111-1111-111111111111',
            'client_id': '22222222-2222-2222-2222-222222222222',
            'resource_url': 'https://contoso.crm4.dynamics.com',
            'client_secret': 'only-for-test-secret',
        }

    def test_secret_is_encrypted_and_never_returned_and_survives_blank_update(self):
        response = self.client.put(self.url, self.data)
        self.assertEqual(response.status_code, 200)
        encrypted = DynamicsConnection.objects.get().encrypted_secret
        self.assertNotIn(self.data['client_secret'], encrypted)
        self.assertNotIn('client_secret', response.data)
        self.assertNotIn('encrypted_secret', response.data)
        self.assertNotIn(self.data['client_secret'], str(self.client.get(self.url).data))
        self.client.put(self.url, {**self.data, 'client_secret': ''})
        self.assertEqual(DynamicsConnection.objects.get().encrypted_secret, encrypted)
        client = DynamicsConnectionService.client()
        self.assertEqual(client.client_secret, self.data['client_secret'])
        self.assertFalse(client.simulation_mode)

    def test_role_and_authentication_protect_read_write_and_test(self):
        for role in (User.KAM, User.CLIENT_B2B, User.SALESPERSON):
            self.admin.role = role
            self.admin.save()
            self.assertEqual(self.client.get(self.url).status_code, 403)
            self.assertEqual(self.client.put(self.url, self.data).status_code, 403)
            self.assertEqual(self.client.post(self.url + 'test/').status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_invalid_urls_and_missing_credentials_are_rejected(self):
        for url in ('http://contoso.crm4.dynamics.com', 'https://127.0.0.1',
                    'https://contoso.crm4.dynamics.com.evil.com',
                    'https://contoso.crm4.dynamics.com/path',
                    'https://contoso.crm4.dynamics.com:8443'):
            self.assertEqual(self.client.put(self.url, {**self.data, 'resource_url': url}).status_code, 400)
        self.assertEqual(self.client.put(self.url, {**self.data, 'tenant_id': 'bad'}).status_code, 400)
        self.assertEqual(self.client.put(self.url, {**self.data, 'client_secret': ''}).status_code, 400)
        self.assertFalse(DynamicsConnection.objects.exists())

    @patch('accounts.dynamics_service.DynamicsConnectionService.client')
    def test_real_identity_check_and_safe_error(self, factory):
        self.client.put(self.url, self.data)
        factory.return_value.check_connection.return_value = {'UserId': 'application-user'}
        self.assertEqual(self.client.post(self.url + 'test/').status_code, 200)
        self.assertIsNotNone(DynamicsConnection.objects.get().verified_at)
        factory.side_effect = DataverseClientException('sensitive-provider-response')
        response = self.client.post(self.url + 'test/')
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('sensitive-provider-response', str(response.data))

    def test_worker_cannot_simulate_success_without_configuration(self):
        op = SyncOperation.objects.create(entity_type='ACCOUNT', entity_id='1', operation='CREATE', payload={})
        self.assertEqual(DynamicsOutboxWorker().process_pending_operations(), 0)
        op.refresh_from_db()
        self.assertNotEqual(op.status, 'SUCCEEDED')
        self.assertFalse(op.remote_id)
