from copy import deepcopy
from datetime import timedelta
from unittest.mock import patch, Mock
from uuid import UUID, uuid4

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.models import RelationshipCoverage
from kam.integrations.dynamics.client import DataverseClient, DataverseClientException
from accounts.models import User, DynamicsConnection, DynamicsImportRun, DynamicsImportedRecord
from accounts.dynamics_service import DynamicsConnectionService
from accounts.dynamics_mapping import discover, mapped_record, query_for
from accounts.dynamics_import_service import enqueue, process_next_import, claim, schedule_due


ACCOUNT = '11111111-1111-1111-1111-111111111111'
CONTACT = '22222222-2222-2222-2222-222222222222'
ASSET = '33333333-3333-3333-3333-333333333333'
CURRENCY = '44444444-4444-4444-4444-444444444444'
FORMATTED = '@OData.Community.Display.V1.FormattedValue'
LOOKUP_TYPE = '@Microsoft.Dynamics.CRM.lookuplogicalname'


def attr(name, kind='String'):
    return {'LogicalName': name, 'AttributeType': kind, 'IsValidForRead': True}


class FakeDynamics:
    """Métadonnées et pages distantes indépendantes de l'implémentation du mapper."""
    entities = [
        {'LogicalName': 'account', 'EntitySetName': 'accounts', 'PrimaryIdAttribute': 'accountid', 'PrimaryNameAttribute': 'name'},
        {'LogicalName': 'contact', 'EntitySetName': 'contacts', 'PrimaryIdAttribute': 'contactid', 'PrimaryNameAttribute': 'fullname'},
        {'LogicalName': 'msdyn_customerasset', 'EntitySetName': 'msdyn_customerassets', 'PrimaryIdAttribute': 'msdyn_customerassetid', 'PrimaryNameAttribute': 'msdyn_name'},
        {'LogicalName': 'opportunity', 'EntitySetName': 'opportunities', 'PrimaryIdAttribute': 'opportunityid', 'PrimaryNameAttribute': 'name'},
        {'LogicalName': 'appointment', 'EntitySetName': 'appointments', 'PrimaryIdAttribute': 'activityid', 'PrimaryNameAttribute': 'subject'},
    ]
    attributes = {
        'account': [attr('accountid', 'Uniqueidentifier'), attr('name'), attr('industrycode', 'Picklist'),
                    attr('numberofemployees', 'Integer'), attr('revenue', 'Money'), attr('transactioncurrencyid', 'Lookup')],
        'contact': [attr('contactid', 'Uniqueidentifier'), attr('fullname'), attr('parentcustomerid', 'Customer'),
                    attr('emailaddress1'), attr('jobtitle'), attr('telephone1')],
        'msdyn_customerasset': [attr('msdyn_customerassetid', 'Uniqueidentifier'), attr('msdyn_name'), attr('msdyn_account', 'Lookup'),
                                attr('statecode', 'State'), attr('new_bandwidthmbps', 'Integer'), attr('new_simcount', 'Integer')],
        'opportunity': [attr('opportunityid', 'Uniqueidentifier'), attr('name'), attr('parentaccountid', 'Lookup')],
        'appointment': [attr('activityid', 'Uniqueidentifier'), attr('subject'), attr('regardingobjectid', 'Lookup'), attr('scheduledstart', 'DateTime')],
    }

    def __init__(self):
        self.entities = deepcopy(self.entities)
        self.attributes = deepcopy(self.attributes)
        self.pages = {
            'accounts': {'value': [{'accountid': ACCOUNT, 'name': 'Compte réel', 'industrycode': 5,
                                    'industrycode' + FORMATTED: 'Mines & Énergie', 'numberofemployees': 3500,
                                    'revenue': 2000000, '_transactioncurrencyid_value': CURRENCY}]},
            'contacts': {'value': [{'contactid': CONTACT, 'fullname': 'Contact réel', '_parentcustomerid_value': ACCOUNT,
                                    '_parentcustomerid_value' + LOOKUP_TYPE: 'account', 'jobtitle': 'DSI', 'emailaddress1': 'contact@example.com'}]},
            'msdyn_customerassets': {'value': [{'msdyn_customerassetid': ASSET, 'msdyn_name': 'Fibre dédiée souscrite',
                                                '_msdyn_account_value': ACCOUNT, 'statecode': 0, 'new_bandwidthmbps': 100}]},
            'opportunities': {'value': [{'opportunityid': '55555555-5555-5555-5555-555555555555', 'name': 'Projet réel', '_parentaccountid_value': ACCOUNT}]},
            'appointments': {'value': [{'activityid': '66666666-6666-6666-6666-666666666666', 'subject': 'Visite CRM', '_regardingobjectid_value': ACCOUNT, 'scheduledstart': '2026-11-10T09:00:00Z'}]},
        }
        self.calls = []

    def read_collection(self, path):
        self.calls.append(path)
        if path.startswith('EntityDefinitions?'):
            return deepcopy(self.entities)
        if path.startswith('transactioncurrencies?'):
            return [{'transactioncurrencyid': CURRENCY, 'isocurrencycode': 'USD'}]
        if path.startswith('systemusers?'):
            return [{'systemuserid': CONTACT, 'internalemailaddress': 'kam@example.com'}]
        logical = path.split("LogicalName='")[1].split("'")[0]
        if 'LookupAttributeMetadata' in path:
            return [{'LogicalName': name, 'Targets': targets} for name, targets in {
                'parentcustomerid': ['account', 'contact'], 'msdyn_account': ['account'],
                'parentaccountid': ['account'], 'regardingobjectid': ['account'],
            }.items()]
        return deepcopy(self.attributes[logical])

    def read_page(self, path):
        self.calls.append(path)
        if 'StateAttributeMetadata' in path:
            return {'OptionSet': {'Options': [{'Value': 0, 'InvariantName': 'Active'}, {'Value': 1, 'InvariantName': 'Inactive'}]}}
        collection = path.split('?')[0].rsplit('/', 1)[-1]
        return deepcopy(self.pages[collection])


class MappingTests(TestCase):
    def test_metadata_resolves_standard_custom_fields_and_lookup_values(self):
        mapping = discover(FakeDynamics())
        self.assertEqual(mapping['scopes']['offers']['fields']['bandwidth'], 'new_bandwidthmbps')
        self.assertEqual(mapping['scopes']['contacts']['fields']['account'], '_parentcustomerid_value')
        self.assertTrue(mapping['scopes']['contacts']['polymorphic_account'])
        self.assertNotIn('licenses', mapping['scopes']['accounts']['fields'])

    def test_ambiguous_installed_tables_are_not_guessed_and_can_be_selected(self):
        client = FakeDynamics()
        client.entities.append({'LogicalName': 'new_subscription', 'EntitySetName': 'new_subscriptions', 'PrimaryIdAttribute': 'new_subscriptionid', 'PrimaryNameAttribute': 'new_name'})
        self.assertNotIn('offers', discover(client)['scopes'])
        self.assertIn('offers', discover(client, 'msdyn_customerasset')['scopes'])

    def test_catalogue_products_never_become_installed_offers(self):
        client = FakeDynamics()
        client.entities = [e for e in client.entities if e['LogicalName'] != 'msdyn_customerasset']
        client.entities.append({'LogicalName': 'product', 'EntitySetName': 'products', 'PrimaryIdAttribute': 'productid', 'PrimaryNameAttribute': 'name'})
        self.assertNotIn('offers', discover(client)['scopes'])

    def test_ambiguous_custom_fields_are_omitted(self):
        client = FakeDynamics()
        client.attributes['msdyn_customerasset'].append(attr('other_bandwidthmbps', 'Integer'))
        self.assertNotIn('bandwidth', discover(client)['scopes']['offers']['fields'])

    def test_relation_to_an_account_is_required(self):
        client = FakeDynamics()
        client.attributes['contact'] = [a for a in client.attributes['contact'] if a['LogicalName'] != 'parentcustomerid']
        self.assertNotIn('contacts', discover(client)['scopes'])


class ImportTests(APITestCase):
    def setUp(self):
        DynamicsConnectionService.save({'tenant_id': ACCOUNT, 'client_id': CONTACT,
            'resource_url': 'https://contoso.crm4.dynamics.com', 'client_secret': 'test-only-secret', 'auto_import_enabled': False})
        DynamicsConnection.objects.filter(pk=1).update(verified_at=timezone.now())
        self.remote = FakeDynamics()
        self.factory = patch('accounts.dynamics_import_service.DynamicsConnectionService.client', return_value=self.remote)
        self.factory.start()
        self.addCleanup(self.factory.stop)

    def drain(self):
        for _ in range(15):
            if not process_next_import():
                break

    def test_complete_import_populates_accounts_contacts_offers_and_related_history(self):
        run = enqueue()
        self.drain()
        run.refresh_from_db()
        self.assertEqual(run.status, 'PARTIAL', run.error)  # Optional custom fields absent are reported.
        self.assertEqual(DynamicsImportedRecord.objects.count(), 5)
        account = Enterprise.objects.get(crm_id=ACCOUNT)
        self.assertEqual(account.employee_count, 3500)
        self.assertEqual(account.annual_revenue, 2000000)
        self.assertIsNone(account.site_count)
        self.assertEqual(RelationshipCoverage.objects.get().enterprise_id, account.pk)
        offer = EnterpriseInstalledOffer.objects.get()
        self.assertEqual(offer.bandwidth_mbps, 100)
        self.assertEqual(offer.contract_status, 'ACTIVE')
        self.assertIsNone(offer.active_licenses_count)
        self.assertIsNone(offer.monthly_cost_mrr)
        self.assertTrue(account.crm_projection.last_pulled_at)
        self.assertEqual(set(run.counts), {'accounts', 'contacts', 'offers', 'opportunities', 'appointments'})

    def test_reimport_updates_without_duplicates_or_touching_manual_notes_and_products(self):
        enqueue(); self.drain()
        account = Enterprise.objects.get(crm_id=ACCOUNT)
        manual = EnterpriseInstalledOffer.objects.create(enterprise=account, installed_offer_name='Produit saisi par KAM')
        contact = RelationshipCoverage.objects.get()
        contact.notes = 'Note locale à conserver'
        contact.save()
        self.remote.pages['accounts']['value'][0]['name'] = 'Compte renommé'
        self.remote.pages['msdyn_customerassets']['value'][0]['statecode'] = 1
        enqueue(); self.drain()
        self.assertEqual(Enterprise.objects.count(), 1)
        self.assertEqual(EnterpriseInstalledOffer.objects.count(), 2)
        self.assertTrue(EnterpriseInstalledOffer.objects.filter(pk=manual.pk).exists())
        self.assertEqual(RelationshipCoverage.objects.get().notes, 'Note locale à conserver')
        self.assertEqual(DynamicsImportedRecord.objects.get(kind='offers').installed_offer.contract_status, 'INACTIVE')

    def test_unknown_status_and_non_usd_amounts_are_not_invented(self):
        self.remote.pages['accounts']['value'][0]['_transactioncurrencyid_value'] = str(uuid4())
        self.remote.pages['msdyn_customerassets']['value'][0]['statecode'] = 22
        enqueue(); self.drain()
        self.assertIsNone(Enterprise.objects.get().annual_revenue)
        self.assertEqual(EnterpriseInstalledOffer.objects.get().contract_status, 'UNKNOWN')

    def test_paging_survives_worker_restart(self):
        self.remote.pages['accounts']['@odata.nextLink'] = 'https://contoso.crm4.dynamics.com/api/data/v9.2/accounts_page2'
        self.remote.pages['accounts_page2'] = {'value': [{'accountid': '77777777-7777-7777-7777-777777777777', 'name': 'Second compte'}]}
        run = enqueue()
        process_next_import()
        run.refresh_from_db()
        self.assertIn('accounts_page2', run.cursor['next'])
        self.drain()
        self.assertEqual(Enterprise.objects.count(), 2)
        run.refresh_from_db()
        self.assertEqual(run.counts['accounts']['imported'], 2)

    def test_bad_rows_do_not_abort_other_rows_and_parent_contact_is_not_treated_as_account(self):
        self.remote.pages['contacts']['value'][0]['_parentcustomerid_value' + LOOKUP_TYPE] = 'contact'
        self.remote.pages['accounts']['value'].append({'accountid': 'not-a-guid', 'name': 'Invalid'})
        run = enqueue(); self.drain(); run.refresh_from_db()
        self.assertEqual(Enterprise.objects.count(), 1)
        self.assertEqual(RelationshipCoverage.objects.count(), 0)
        self.assertEqual(run.counts['contacts']['skipped'], 1)

    def test_missing_polymorphic_type_is_not_guessed(self):
        del self.remote.pages['contacts']['value'][0]['_parentcustomerid_value' + LOOKUP_TYPE]
        enqueue(); self.drain()
        self.assertFalse(RelationshipCoverage.objects.exists())

    def test_failed_page_does_not_report_success_or_leak_provider_error(self):
        self.remote.read_page = Mock(side_effect=DataverseClientException('secret response should stay private'))
        run = enqueue(); self.drain(); run.refresh_from_db()
        self.assertEqual(run.status, 'FAILED')
        self.assertNotIn('secret response', run.error)

    def test_active_job_is_not_duplicated_and_expired_lease_is_reclaimed(self):
        run = enqueue()
        self.assertEqual(enqueue().pk, run.pk)
        first = claim()
        self.assertIsNone(claim())
        DynamicsImportRun.objects.filter(pk=run.pk).update(lease_until=timezone.now() - timedelta(seconds=1))
        second = claim()
        self.assertEqual(first.pk, second.pk)
        self.assertNotEqual(first.lease_token, second.lease_token)

    def test_credential_change_during_import_aborts_before_new_writes(self):
        run = enqueue()
        DynamicsConnection.objects.filter(pk=1).update(updated_at=timezone.now())
        self.drain(); run.refresh_from_db()
        self.assertEqual(run.status, 'FAILED')
        self.assertFalse(Enterprise.objects.exists())

    def test_schedule_only_runs_when_enabled_verified_and_due(self):
        schedule_due()
        self.assertFalse(DynamicsImportRun.objects.exists())
        DynamicsConnection.objects.filter(pk=1).update(auto_import_enabled=True)
        schedule_due(); schedule_due()
        self.assertEqual(DynamicsImportRun.objects.count(), 1)
        self.assertGreater(DynamicsConnection.objects.get().next_import_at, timezone.now())

    def test_admin_endpoints_and_record_visibility(self):
        admin = User.objects.create_user(username='import-admin', role=User.ADMIN)
        kam = User.objects.create_user(username='import-kam', role=User.KAM)
        self.client.force_authenticate(kam)
        for path in ('imports/', 'mapping/'):
            self.assertEqual(self.client.post('/api/accounts/integrations/dynamics/' + path).status_code, 403)
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.post('/api/accounts/integrations/dynamics/imports/').status_code, 202)
        self.drain()
        account = Enterprise.objects.get()
        path = f'/api/accounts/integrations/dynamics/records/?enterprise_id={account.pk}'
        self.assertEqual(len(self.client.get(path).data['results']), 5)
        self.client.force_authenticate(kam)
        self.assertEqual(self.client.get(path).data['results'], [])
        account.assigned_kam = kam; account.save()
        self.assertEqual(len(self.client.get(path).data['results']), 5)

    def test_crm_owner_matches_an_existing_kam_by_email_only(self):
        kam = User.objects.create_user(username='owner-kam', role=User.KAM, email='kam@example.com')
        self.remote.attributes['account'].append(attr('ownerid', 'Owner'))
        self.remote.pages['accounts']['value'][0]['_ownerid_value'] = CONTACT
        enqueue(); self.drain()
        self.assertEqual(Enterprise.objects.get().assigned_kam_id, kam.pk)
        self.assertTrue(any('systemuserid+eq' in path for path in self.remote.calls if path.startswith('systemusers?')))

    def test_pending_local_crm_updates_are_not_overwritten(self):
        enqueue(); self.drain()
        account = Enterprise.objects.get()
        projection = account.crm_projection
        projection.sync_status = 'PENDING_PUSH'; projection.save()
        self.remote.pages['accounts']['value'][0]['name'] = 'Nom distant à ne pas écraser'
        run = enqueue(); self.drain(); run.refresh_from_db()
        account.refresh_from_db()
        self.assertEqual(account.name, 'Compte réel')
        self.assertEqual(run.counts['accounts']['skipped'], 1)


class ReadSecurityTests(TestCase):
    def test_nextlink_rejects_foreign_origin_and_redirect_before_sending_credentials(self):
        client = DataverseClient(tenant_id=ACCOUNT, client_id=CONTACT, client_secret='test-only', resource_url='https://contoso.crm4.dynamics.com', simulation_mode=False)
        with patch('kam.integrations.dynamics.client.requests.get') as get:
            for path in ('https://evil.example/api/data/v9.2/accounts', 'https://contoso.crm4.dynamics.com/other',
                         'https://contoso.crm4.dynamics.com/api/data/v9.2/../private'):
                with self.assertRaises(DataverseClientException):
                    client.read_page(path)
            get.assert_not_called()
        with patch.object(client, '_get_access_token', return_value='token'), patch('kam.integrations.dynamics.client.requests.get') as get:
            get.return_value.status_code = 302
            with self.assertRaises(DataverseClientException):
                client.read_page('accounts?$select=name')
            self.assertFalse(get.call_args.kwargs['allow_redirects'])
