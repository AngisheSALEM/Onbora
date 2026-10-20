import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from sales.models import Enterprise, Plaque
from kam.models import B2BNewsFeedItem
from kam.services.news_feed_service import B2BNewsFeedService

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
        feed_data = B2BNewsFeedService.get_feed(self.kam_user, feed_type='ALL')
        self.assertGreaterEqual(feed_data["total_count"], 5)
        self.assertIn("counters", feed_data)
        self.assertGreater(feed_data["counters"]["portfolio"], 0)
        self.assertGreater(feed_data["counters"]["web_discovery"], 0)

    def test_feed_filtering_by_type(self):
        B2BNewsFeedService.seed_sample_news(self.kam_user)
        
        # Portfolio only
        portfolio_feed = B2BNewsFeedService.get_feed(self.kam_user, feed_type='PORTFOLIO')
        for item in portfolio_feed["items"]:
            self.assertFalse(item.is_web_discovery)

        # Web discovery only
        web_feed = B2BNewsFeedService.get_feed(self.kam_user, feed_type='WEB_DISCOVERY')
        for item in web_feed["items"]:
            self.assertTrue(item.is_web_discovery)

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

    def test_api_feed_endpoints(self):
        # 1. GET /api/kam/feed/
        res = self.client.get('/api/kam/feed/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertIn("counters", res.data)

        # 2. POST /api/kam/feed/<pk>/read/
        item = B2BNewsFeedItem.objects.first()
        res_read = self.client.post(f'/api/kam/feed/{item.id}/read/', {'is_read': True})
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertTrue(res_read.data["is_read"])

        # 3. POST /api/kam/feed/<pk>/save/
        res_save = self.client.post(f'/api/kam/feed/{item.id}/save/')
        self.assertEqual(res_save.status_code, status.HTTP_200_OK)

        # 4. POST /api/kam/feed/refresh/
        res_refresh = self.client.post('/api/kam/feed/refresh/')
        self.assertEqual(res_refresh.status_code, status.HTTP_200_OK)
