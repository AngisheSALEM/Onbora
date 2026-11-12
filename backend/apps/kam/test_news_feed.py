import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from sales.models import Enterprise, Plaque
from kam.models import B2BNewsFeedItem
from kam.services.news_feed_service import B2BNewsFeedService
from ai_core.services.commercial_signal_scorer import commercial_signal_scorer

User = get_user_model()


class B2BNewsFeedServiceTestCase(TestCase):
    def setUp(self):
        self.kam_user = User.objects.create_user(
            username="kam_tester",
            email="kam_tester@onbora.cd",
            password="testpassword123",
            role="KAM"
        )
        self.plaque = Plaque.objects.create(
            code="KIN-GOMBE-TEST",
            name="Kinshasa - Gombe Test",
            city="Kinshasa"
        )
        self.enterprise = Enterprise.objects.create(
            name="Banque Commerciale du Congo (Test)",
            sector="Banque & Finance",
            location="Kinshasa",
            plaque=self.plaque.name,
            plaque_rel=self.plaque,
            assigned_kam=self.kam_user
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.kam_user)

    def test_seed_and_get_feed(self):
        B2BNewsFeedService.seed_sample_news(self.kam_user)
        feed_data = B2BNewsFeedService.get_feed(self.kam_user, feed_type='ALL')
        self.assertGreaterEqual(feed_data["total_count"], 5)
        self.assertIn("counters", feed_data)
        self.assertGreater(feed_data["counters"]["portfolio"], 0)
        self.assertGreater(feed_data["counters"]["web_discovery"], 0)
        self.assertIn("strong_signals", feed_data["counters"])
        self.assertIn("weak_signals", feed_data["counters"])
        self.assertGreater(feed_data["counters"]["strong_signals"], 0)
        self.assertGreater(feed_data["counters"]["weak_signals"], 0)

    def test_feed_filtering_by_type_and_signal(self):
        B2BNewsFeedService.seed_sample_news(self.kam_user)
        
        # Portfolio only
        portfolio_feed = B2BNewsFeedService.get_feed(self.kam_user, feed_type='PORTFOLIO')
        for item in portfolio_feed["items"]:
            self.assertFalse(item.is_web_discovery)

        # Web discovery only
        web_feed = B2BNewsFeedService.get_feed(self.kam_user, feed_type='WEB_DISCOVERY')
        for item in web_feed["items"]:
            self.assertTrue(item.is_web_discovery)

        # Filter by Strong signals
        strong_feed = B2BNewsFeedService.get_feed(self.kam_user, signal_strength='STRONG')
        self.assertGreater(len(strong_feed["items"]), 0)
        for item in strong_feed["items"]:
            self.assertEqual(item.signal_strength, 'STRONG')
            self.assertGreaterEqual(item.signal_score, 70)

        # Filter by Weak signals
        weak_feed = B2BNewsFeedService.get_feed(self.kam_user, signal_strength='WEAK')
        self.assertGreater(len(weak_feed["items"]), 0)
        for item in weak_feed["items"]:
            self.assertEqual(item.signal_strength, 'WEAK')
            self.assertLess(item.signal_score, 70)

    def test_commercial_signal_scorer_heuristics(self):
        # 1. Strong signal: incident / concurrent
        res_incident = commercial_signal_scorer.score_news(
            title="Panne majeure et coupure internet sur les sites miniers de l'opérateur concurrent",
            summary="Interruption des flux SCADA pendant 8 heures à Kolwezi",
            category="INCIDENT"
        )
        self.assertEqual(res_incident["signal_strength"], "STRONG")
        self.assertGreaterEqual(res_incident["signal_score"], 80)
        self.assertIn("concurrent", res_incident["signal_rationale"].lower())

        # 2. Strong signal: expansion & nouvelles agences
        res_expansion = commercial_signal_scorer.score_news(
            title="Ouverture de 5 nouvelles agences bancaires à Lubumbashi",
            summary="Extension du réseau commercial et recrutement",
            category="EXPANSION"
        )
        self.assertEqual(res_expansion["signal_strength"], "STRONG")
        self.assertGreaterEqual(res_expansion["signal_score"], 75)

        # 3. Weak signal: RSE & vœux
        res_weak = commercial_signal_scorer.score_news(
            title="Soirée des vœux institutionnels et remise des trophées RSE",
            summary="Événementiel interne de célébration et mécénat associatif",
            category="MANAGEMENT"
        )
        self.assertEqual(res_weak["signal_strength"], "WEAK")
        self.assertLess(res_weak["signal_score"], 70)
        self.assertIn("faible", res_weak["signal_rationale"].lower())

    def test_search_and_category_filter(self):
        B2BNewsFeedService.seed_sample_news(self.kam_user)
        
        # Filter by search
        search_feed = B2BNewsFeedService.get_feed(self.kam_user, search="Kolwezi")
        for item in search_feed["items"]:
            text_block = f"{item.title} {item.summary} {item.discovered_location} {item.commercial_angle}"
            self.assertTrue("Kolwezi" in text_block or "kolwezi" in text_block.lower())

    def test_mark_as_read_and_save_toggle(self):
        item = B2BNewsFeedItem.objects.create(
            title="Alerte Télécoms Rawbank",
            summary="Test d'alerte",
            enterprise=self.enterprise,
            is_read=False,
            is_saved=False
        )
        
        # Toggle read
        updated = B2BNewsFeedService.mark_as_read(str(item.id), is_read=True)
        self.assertTrue(updated.is_read)

        # Toggle save
        saved = B2BNewsFeedService.toggle_saved(str(item.id))
        self.assertTrue(saved.is_saved)

    def test_convert_web_discovery_to_portfolio(self):
        item = B2BNewsFeedItem.objects.create(
            title="Nouveau courtier minier",
            summary="Courtage de cobalt à Kolwezi",
            is_web_discovery=True,
            discovered_company_name="Katanga Cobalt Hub",
            discovered_sector="Mines & Négoce",
            discovered_location="Kolwezi",
            discovered_website="https://cobalthub.cd",
            discovered_size="30 salariés"
        )
        
        result = B2BNewsFeedService.convert_to_portfolio_account(str(item.id), self.kam_user)
        self.assertIn("enterprise_id", result)
        
        item.refresh_from_db()
        self.assertTrue(item.is_converted_to_portfolio)
        self.assertIsNotNone(item.enterprise)
        self.assertEqual(item.enterprise.name, "Katanga Cobalt Hub")
        self.assertEqual(item.enterprise.assigned_kam, self.kam_user)
        self.assertEqual(item.enterprise.current_connectivity, "")
        self.assertFalse(item.enterprise.installed_offers.exists())
        self.assertIsNone(result["overall_score"])

    def test_api_feed_endpoints_with_signal_filter(self):
        B2BNewsFeedService.seed_sample_news(self.kam_user)
        # 1. GET /api/kam/feed/
        res = self.client.get('/api/kam/feed/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertIn("counters", res.data)
        self.assertIn("strong_signals", res.data["counters"])
        self.assertIn("weak_signals", res.data["counters"])

        # Check fields in results
        first_item = res.data["results"][0]
        self.assertIn("signal_strength", first_item)
        self.assertIn("signal_score", first_item)
        self.assertIn("signal_rationale", first_item)

        # 2. GET /api/kam/feed/?signal=STRONG
        res_strong = self.client.get('/api/kam/feed/?signal=STRONG')
        self.assertEqual(res_strong.status_code, status.HTTP_200_OK)
        for it in res_strong.data["results"]:
            self.assertEqual(it["signal_strength"], "STRONG")

        # 3. GET /api/kam/feed/?signal=WEAK
        res_weak = self.client.get('/api/kam/feed/?signal=WEAK')
        self.assertEqual(res_weak.status_code, status.HTTP_200_OK)
        for it in res_weak.data["results"]:
            self.assertEqual(it["signal_strength"], "WEAK")

        # 4. POST /api/kam/feed/<pk>/read/
        item = B2BNewsFeedItem.objects.first()
        res_read = self.client.post(f'/api/kam/feed/{item.id}/read/', {'is_read': True})
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertTrue(res_read.data["is_read"])

        # 5. POST /api/kam/feed/<pk>/save/
        res_save = self.client.post(f'/api/kam/feed/{item.id}/save/')
        self.assertEqual(res_save.status_code, status.HTTP_200_OK)

        # 6. POST /api/kam/feed/refresh/
        from unittest.mock import patch
        stats = {"updated_accounts": 0, "created_new_leads": 0, "total_jobs_fetched": 0,
                 "skipped_obsolete": 0, "errors": 0}
        with patch('ai_core.company_analysis.sync_service.OnboraAnalysisSyncService.sync_all_jobs', return_value=stats):
            res_refresh = self.client.post('/api/kam/feed/refresh/')
        self.assertEqual(res_refresh.status_code, status.HTTP_200_OK)

    def test_enterprise_specific_news_requires_recorded_sources(self):
        ent = Enterprise.objects.create(
            name='Kamoa-Kakula Mining Complex (Ivanhoe)',
            sector='Mines & Énergie',
            city='Kolwezi',
            assigned_kam=self.kam_user
        )
        res = self.client.get(f'/api/kam/accounts/{ent.id}/news/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 0)
        self.assertIn('results', res.data)
        self.assertEqual(res.data['results'], [])
        self.assertFalse(B2BNewsFeedItem.objects.filter(enterprise=ent).exists())
