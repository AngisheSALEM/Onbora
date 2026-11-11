from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from kam.models import B2BNewsFeedItem, ChurnRadarAssessment, ChurnRadarSnapshot
from kam.models import PreCallBriefing
from kam.services.churn_radar_service import ChurnRadarService
from kam.services.news_feed_service import B2BNewsFeedService
from kam.serializers import B2BNewsFeedItemSerializer
from sales.models import Enterprise


class KAMReadPerformanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username='perf-kam', role='KAM')

    def add_accounts(self, count, offset=0):
        return [Enterprise.objects.create(name=f'Performance {offset + index}',
                sector='Banque & Finance', assigned_kam=self.user) for index in range(count)]

    def read_summary(self):
        with patch.object(ChurnRadarService, 'refresh_account_assessment', side_effect=AssertionError('Write on GET')):
            with patch.object(ChurnRadarService, 'get_upsell_accounts', side_effect=AssertionError('Detailed comparison on GET')):
                with CaptureQueriesContext(connection) as captured:
                    result = ChurnRadarService.get_portfolio_summary(self.user)
        self.assertFalse(any(query['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for query in captured))
        return result, len(captured)

    def test_summary_query_count_does_not_grow_with_accounts(self):
        self.add_accounts(1)
        first, first_queries = self.read_summary()
        self.add_accounts(19, offset=1)
        second, second_queries = self.read_summary()
        self.assertEqual(first['summary_cards']['b2b_accounts']['count'], 1)
        self.assertEqual(second['summary_cards']['b2b_accounts']['count'], 20)
        self.assertEqual(first_queries, second_queries)
        self.assertEqual(second_queries, 10)
        self.assertFalse(ChurnRadarAssessment.objects.exists())
        self.assertFalse(ChurnRadarSnapshot.objects.exists())

    def test_feed_and_serialization_use_three_queries(self):
        account = self.add_accounts(1)[0]
        B2BNewsFeedItem.objects.bulk_create([
            B2BNewsFeedItem(enterprise=account, title=f'News {index}', summary='Extension',
                            is_saved=index % 2 == 0, signal_strength='STRONG') for index in range(30)
        ])
        with self.assertNumQueries(3):
            result = B2BNewsFeedService.get_feed(self.user, limit=10)
            rows = B2BNewsFeedItemSerializer(result['items'], many=True).data
        self.assertEqual(len(rows), 10)
        self.assertEqual(result['total_count'], 30)
        self.assertEqual(result['counters']['all'], 30)
        self.assertEqual(result['counters']['saved'], 15)

    def test_empty_feed_is_a_read_without_automatic_data_creation(self):
        with self.assertNumQueries(3):
            result = B2BNewsFeedService.get_feed(self.user)
        self.assertEqual(result['total_count'], 0)
        self.assertFalse(B2BNewsFeedItem.objects.exists())

    def test_accounts_query_count_is_constant(self):
        self.add_accounts(20)
        client = APIClient()
        client.force_authenticate(self.user)
        with self.assertNumQueries(2):
            response = client.get('/api/kam/accounts/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['accounts']), 20)

    def test_summary_upsell_count_matches_detail_for_news(self):
        account = self.add_accounts(1)[0]
        B2BNewsFeedItem.objects.create(enterprise=account, title='Extension', summary='Extension')
        summary, _ = self.read_summary()
        self.assertEqual(summary['summary_cards']['upsell']['count'],
                         len(ChurnRadarService.get_upsell_accounts(self.user)))

    def test_read_briefing_does_not_persist_generated_fallback(self):
        from apps.ai_core.company_analysis.briefing import read_briefing
        account = self.add_accounts(1)[0]
        engine_result = {'company_overview': {'summary': 'Informations enregistrées'},
                         'ai_summary': {'model': 'research-rules-v2'}}
        with patch('kam.commercial_intelligence_service.get_unified_core_ai') as engine:
            engine.return_value.generate_pre_call_briefing.return_value = engine_result
            with CaptureQueriesContext(connection) as captured:
                result = read_briefing(account, self.user)
        self.assertEqual(result['enterprise_name'], account.name)
        self.assertFalse(PreCallBriefing.objects.exists())
        self.assertFalse(any(query['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for query in captured))

    def test_summary_upsell_count_matches_detail_for_sector_comparison(self):
        account = self.add_accounts(1)[0]
        account.current_connectivity = '4G'
        account.incident_count = 2
        account.save(update_fields=['current_connectivity', 'incident_count'])
        Enterprise.objects.create(name='Sector reference', sector='Banque & Finance',
                                  current_connectivity='Fibre dédiée VPN firewall cloud backup SD-WAN',
                                  employee_count=10, site_count=1)
        summary, _ = self.read_summary()
        details = ChurnRadarService.get_upsell_accounts(self.user)
        self.assertTrue(any(row['source'] == 'COMPARATEUR' for row in details))
        self.assertEqual(summary['summary_cards']['upsell']['count'], len(details))
