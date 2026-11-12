"""Receiver contract, permission boundaries and replay behavior."""
import hashlib
from unittest.mock import patch

from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import User
from sales.models import CrmAccountRecord, Enterprise, SeedImportRecord


class SeedImportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='seed-admin', role='ADMIN')
        self.token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.company = {
            'external_id': 'demo-company-0001', 'kind': 'company', 'source': 'fictional',
            'is_fictitious': True, 'name': 'Entreprise 0001', 'city': 'Kinshasa',
            'sector': 'Services', 'status': 'prospect', 'contacts': [
                {'name': 'Contact 0001', 'email': 'contact@company.example', 'phone': None}],
        }
        key = hashlib.sha256(b'onbora\0registry:42').hexdigest()
        self.lead = {
            'external_id': 'onbora-' + key, 'kind': 'lead', 'source': 'onbora',
            'is_fictitious': False, 'name': 'Entreprise du registre', 'city': 'Lubumbashi',
            'contacts': [], 'status': 'new', 'identifiers': {'rccm': 'CD-42'},
            'onbora': {'instance': 'onbora', 'source_ref': 'registry:42',
                       'company_id': '12345678-1234-5678-1234-567812345678'},
        }

    def put(self, data, external_id=None):
        return self.client.put(reverse('crm-seed-import', kwargs={
            'external_id': external_id or data['external_id']}), data, format='json')

    def test_company_upsert_creates_one_crm_account_and_one_enterprise(self):
        first = self.put(self.company)
        self.assertEqual(first.status_code, 201, first.data)
        second = self.put(self.company)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(first.data['enterprise_id'], second.data['enterprise_id'])
        self.assertEqual(Enterprise.objects.count(), 1)
        self.assertEqual(CrmAccountRecord.objects.count(), 1)
        self.assertEqual(SeedImportRecord.objects.count(), 1)
        self.assertEqual(CrmAccountRecord.objects.get().source_system, 'ONBORA_SEED')

    def test_lead_does_not_create_confirmed_crm_or_invent_qualification(self):
        response = self.put(self.lead)
        self.assertEqual(response.status_code, 201, response.data)
        enterprise = Enterprise.objects.get()
        self.assertIsNone(enterprise.crm_record_id)
        self.assertFalse(CrmAccountRecord.objects.exists())
        self.assertIsNone(enterprise.annual_revenue)
        self.assertIsNone(enterprise.employee_count)
        self.assertIsNone(enterprise.site_count)
        self.assertEqual(enterprise.conversion_score, 0)
        self.assertFalse(enterprise.is_ready_for_conversion)
        self.assertEqual(enterprise.segment, 'UNKNOWN')
        self.assertEqual(enterprise.current_connectivity, '')
        self.assertEqual(SeedImportRecord.objects.get().payload, self.lead)

    def test_replay_preserves_commercial_work_and_updates_registry_profile(self):
        self.put(self.company)
        enterprise = Enterprise.objects.get()
        enterprise.conversion_status = 'IN_NEGOTIATION'
        enterprise.conversion_notes = 'Contrat à revoir'
        enterprise.contact_name = 'Contact corrigé'
        enterprise.assigned_kam = self.admin
        enterprise.save()
        crm = CrmAccountRecord.objects.get()
        crm.crm_contract_status = 'À revoir'
        crm.raw_attributes['manual'] = True
        crm.save()
        self.company['name'] = 'Entreprise renommée'
        self.assertEqual(self.put(self.company).status_code, 200)
        enterprise.refresh_from_db()
        crm.refresh_from_db()
        self.assertEqual(enterprise.name, self.company['name'])
        self.assertEqual(enterprise.contact_name, 'Contact corrigé')
        self.assertEqual(enterprise.assigned_kam_id, self.admin.pk)
        self.assertEqual(enterprise.conversion_status, 'IN_NEGOTIATION')
        self.assertEqual(enterprise.conversion_notes, 'Contrat à revoir')
        self.assertEqual(crm.crm_contract_status, 'À revoir')
        self.assertTrue(crm.raw_attributes['manual'])

    def test_admin_token_required(self):
        self.client.credentials()
        self.assertEqual(self.put(self.company).status_code, 401)
        for role in ('KAM', 'SALESPERSON', 'CLIENT_B2B'):
            user = User.objects.create_user(username=role, role=role)
            token = Token.objects.create(user=user)
            self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
            self.assertEqual(self.put(self.company).status_code, 403)
        self.assertFalse(Enterprise.objects.exists())

    def test_invalid_payload_and_url_mismatch_leave_database_untouched(self):
        for changes in ({'name': ''}, {'source': 'onbora'}, {'is_fictitious': False},
                        {'website': 'javascript:alert(1)'}, {'kind': 'unknown'}):
            self.assertEqual(self.put({**self.company, **changes}).status_code, 400)
        self.assertEqual(self.put(self.company, 'another-id').status_code, 400)
        self.assertFalse(Enterprise.objects.exists())
        self.assertFalse(SeedImportRecord.objects.exists())

    def test_lead_identity_and_empty_contacts_are_enforced(self):
        for changes in ({'onbora': {**self.lead['onbora'], 'source_ref': 'other'}},
                        {'contacts': self.company['contacts']}, {'is_fictitious': True}):
            self.assertEqual(self.put({**self.lead, **changes}).status_code, 400)

    def test_manifest_lead_preserves_source_reference_without_inventing_company_uuid(self):
        del self.lead['onbora']['company_id']
        self.assertEqual(self.put(self.lead).status_code, 201)
        origin = SeedImportRecord.objects.get().payload['onbora']
        self.assertEqual(origin['source_ref'], 'registry:42')
        self.assertNotIn('company_id', origin)

    def test_collision_with_existing_crm_rolls_back_entire_import(self):
        CrmAccountRecord.objects.create(external_crm_id=self.company['external_id'], legal_name='Compte existant')
        self.assertEqual(self.put(self.company).status_code, 409)
        self.assertFalse(Enterprise.objects.exists())
        self.assertFalse(SeedImportRecord.objects.exists())
        self.assertEqual(CrmAccountRecord.objects.get().legal_name, 'Compte existant')

    def test_provenance_cannot_change_on_replay(self):
        self.company['external_id'] = self.lead['external_id']
        self.assertEqual(self.put(self.company).status_code, 201)
        self.assertEqual(self.put(self.lead).status_code, 409)
        self.assertEqual(Enterprise.objects.count(), 1)

    def test_long_name_preserved_in_import_payload(self):
        self.lead['name'] = 'Entreprise ' * 30
        self.assertEqual(self.put(self.lead).status_code, 201)
        self.assertEqual(len(Enterprise.objects.get().name), 100)
        self.assertEqual(SeedImportRecord.objects.get().payload['name'], self.lead['name'])

    def test_failure_rolls_back_import_identity_and_enterprise(self):
        with patch('sales.services.seed_import.CrmAccountRecord.objects.get_or_create',
                   side_effect=RuntimeError('write failed')):
            with self.assertRaises(RuntimeError):
                self.put(self.company)
        self.assertFalse(Enterprise.objects.exists())
        self.assertFalse(SeedImportRecord.objects.exists())

    def test_v1_route_uses_same_import_identity(self):
        self.assertEqual(self.put(self.company).status_code, 201)
        response = self.client.put('/api/v1/crm/seed/records/demo-company-0001/', self.company, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Enterprise.objects.count(), 1)

    def test_relinked_crm_is_not_overwritten_on_replay(self):
        self.put(self.company)
        enterprise = Enterprise.objects.get()
        confirmed = CrmAccountRecord.objects.create(external_crm_id='confirmed-42', legal_name='Compte confirmé')
        enterprise.crm_record = confirmed
        enterprise.save(update_fields=['crm_record'])
        self.company['name'] = 'Nom importé'
        self.assertEqual(self.put(self.company).status_code, 409)
        enterprise.refresh_from_db()
        confirmed.refresh_from_db()
        self.assertEqual(enterprise.name, 'Entreprise 0001')
        self.assertEqual(confirmed.legal_name, 'Compte confirmé')
