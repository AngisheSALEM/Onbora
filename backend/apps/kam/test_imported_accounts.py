"""Imported profiles are visible in the right KAM screens without crossing portfolios."""
import hashlib
from io import StringIO

from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from kam.models import B2BNewsFeedItem
from kam.services.imported_accounts import import_entry_id
from kam.services.news_feed_service import B2BNewsFeedService
from sales.models import Enterprise, SeedImportRecord
from sales.seed_serializers import SeedRecordSerializer
from sales.services.seed_import import import_seed_record


class ImportedAccountScreensTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='owner', role='KAM')
        self.other = User.objects.create_user(username='other', role='KAM')
        self.client.force_authenticate(self.kam)
        self.company = {'external_id': 'demo-company-0001', 'kind': 'company',
                        'source': 'fictional', 'is_fictitious': True, 'name': 'Compte CRM',
                        'sector': 'Services', 'assigned_kam_username': self.kam.username}
        self.lead = {'external_id': 'onbora-' + hashlib.sha256(b'onbora\0registry:42').hexdigest(),
                     'kind': 'lead', 'source': 'onbora', 'is_fictitious': False,
                     'name': 'Compte du registre', 'sector': 'Industrie', 'contacts': [],
                     'activity': 'Transport et logistique',
                     'onbora': {'instance': 'onbora', 'source_ref': 'registry:42',
                                'company_id': '12345678-1234-5678-1234-567812345678'}}

    def import_record(self, payload):
        serializer = SeedRecordSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return import_seed_record(serializer.validated_data, payload)[0]

    def feed(self, scope='ALL', **params):
        response = self.client.get('/api/kam/feed/', {'type': scope, **params})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_assigned_crm_profile_appears_in_accounts_and_portfolio(self):
        enterprise = self.import_record(self.company)
        response = self.client.get('/api/kam/accounts/')
        self.assertEqual(response.status_code, 200, response.data)
        account = next(row for row in response.data['accounts'] if row['account_id'] == str(enterprise.pk))
        self.assertEqual(account['account_origin'], {'code': 'CRM', 'label': 'CRM'})
        item = self.feed('PORTFOLIO')['results'][0]
        self.assertTrue(item['is_profile_entry'])
        self.assertEqual(item['account_origin']['code'], 'CRM')
        self.assertEqual(item['title'], 'Fiche compte intégrée')
        self.assertEqual(item['recommended_offer'], '')

    def test_registry_lead_is_visible_then_moves_to_portfolio(self):
        enterprise = self.import_record(self.lead)
        lead = self.feed('WEB_DISCOVERY')['results'][0]
        self.assertEqual(lead['account_origin']['label'], 'Onbora Analysis')
        self.assertEqual(lead['summary'], self.lead['activity'])
        self.assertEqual(self.feed('PORTFOLIO')['count'], 0)
        response = self.client.post(f"/api/kam/feed/{lead['id']}/convert/")
        self.assertEqual(response.status_code, 200, response.data)
        enterprise.refresh_from_db()
        self.assertEqual(enterprise.assigned_kam_id, self.kam.pk)
        self.assertEqual(enterprise.assigned_entity, 'KAM_OFFICE')
        self.assertIsNone(enterprise.employee_count)
        self.assertEqual(self.feed('WEB_DISCOVERY')['count'], 0)
        self.assertEqual(self.feed('PORTFOLIO')['count'], 1)
        self.assertEqual(Enterprise.objects.count(), 1)
        # Replay must not turn the account into a discovery again.
        self.import_record(self.lead)
        self.assertEqual(self.feed('WEB_DISCOVERY')['count'], 0)
        self.assertEqual(self.feed('PORTFOLIO')['count'], 1)

    def test_other_kam_cannot_see_counts_or_modify_imported_portfolio(self):
        self.import_record(self.company)
        item = B2BNewsFeedItem.objects.get()
        self.client.force_authenticate(self.other)
        data = self.feed()
        self.assertEqual(data['count'], 0)
        self.assertEqual(data['counters']['all'], 0)
        self.assertEqual(self.client.post(f'/api/kam/feed/{item.pk}/save/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/kam/feed/{item.pk}/read/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/kam/feed/{item.pk}/convert/').status_code, 400)
        self.client.post('/api/kam/feed/mark-all-read/')
        item.refresh_from_db()
        self.assertFalse(item.is_read)
        self.assertFalse(item.is_saved)

    def test_origin_filter_and_serialization_use_constant_queries(self):
        self.import_record(self.company)
        self.import_record(self.lead)
        self.assertEqual(self.feed(origin='CRM')['count'], 1)
        self.assertEqual(self.feed(origin='ANALYSIS')['count'], 1)
        self.assertEqual(self.client.get('/api/kam/feed/', {'origin': 'INVALID'}).status_code, 400)
        from kam.serializers import B2BNewsFeedItemSerializer
        with self.assertNumQueries(3):
            feed = B2BNewsFeedService.get_feed(self.kam)
            self.assertEqual(len(B2BNewsFeedItemSerializer(feed['items'], many=True).data), 2)

    def test_backfill_and_replay_preserve_favorites_and_publication(self):
        self.import_record(self.company)
        item = B2BNewsFeedItem.objects.get()
        item.is_saved = True
        item.is_read = True
        item.save()
        original_date = item.published_at
        self.company['name'] = 'Compte actualisé'
        self.import_record(self.company)
        call_command('sync_imported_accounts', '--apply', stdout=StringIO())
        item.refresh_from_db()
        self.assertEqual(B2BNewsFeedItem.objects.count(), 1)
        self.assertEqual(item.discovered_company_name, 'Compte actualisé')
        self.assertEqual(item.published_at, original_date)
        self.assertTrue(item.is_saved)
        self.assertTrue(item.is_read)

    def test_backfill_existing_import_does_not_need_reimport(self):
        self.import_record(self.company)
        B2BNewsFeedItem.objects.all().delete()
        call_command('sync_imported_accounts', stdout=StringIO())
        self.assertFalse(B2BNewsFeedItem.objects.exists())
        call_command('sync_imported_accounts', '--apply', stdout=StringIO())
        self.assertTrue(B2BNewsFeedItem.objects.filter(id=import_entry_id(self.company['external_id'])).exists())

    def test_invalid_owner_rolls_back_and_replay_preserves_existing_assignment(self):
        with self.assertRaises(Exception):
            self.import_record({**self.company, 'assigned_kam_username': 'absent'})
        self.assertFalse(SeedImportRecord.objects.exists())
        enterprise = self.import_record(self.company)
        self.import_record({**self.company, 'assigned_kam_username': self.other.username})
        enterprise.refresh_from_db()
        self.assertEqual(enterprise.assigned_kam_id, self.kam.pk)

    def test_client_role_cannot_access_any_feed_route(self):
        self.import_record(self.lead)
        item = B2BNewsFeedItem.objects.get()
        self.client.force_authenticate(User.objects.create_user(username='customer', role='CLIENT_B2B'))
        self.assertEqual(self.client.get('/api/kam/feed/').status_code, 403)
        for action in ('save', 'read', 'convert'):
            self.assertEqual(self.client.post(f'/api/kam/feed/{item.pk}/{action}/').status_code, 403)

    def test_profile_import_is_not_counted_as_an_upsell_signal(self):
        from kam.services.portfolio_upsell_count import count_portfolio_upsells
        enterprise = self.import_record({**self.company, 'sector': ''})
        self.assertEqual(count_portfolio_upsells([enterprise]), 0)
