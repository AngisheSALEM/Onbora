from __future__ import annotations

from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.ai_core.vector_search.singleton import get_vector_search_service
from apps.ai_core.market_intel.collectors.rss_collector import RSSCollector, RawSignal, _parse_date
from apps.ai_core.market_intel.resolver import EnterpriseResolver
from sales.models import Enterprise
from kam.models import B2BNewsFeedItem

User = get_user_model()


class VectorSearchServiceTestCase(TestCase):
    """Tests unitaires du service vectoriel in-process."""

    def setUp(self):
        self.svc = get_vector_search_service()

    def test_search_returns_results(self):
        results = self.svc.search("banque finance connectivite fibre", n_results=3)
        self.assertIsInstance(results, list)
        self.assertLessEqual(len(results), 3)
        if results:
            first = results[0]
            self.assertTrue(hasattr(first, "doc_id"))
            self.assertTrue(hasattr(first, "score"))
            self.assertTrue(hasattr(first, "content"))
            self.assertGreaterEqual(first.score, 0.0)

    def test_search_with_doc_type_filter(self):
        results = self.svc.search("fibre optique", n_results=5, doc_type_filter="service_catalog")
        for res in results:
            self.assertEqual(res.doc_type, "service_catalog")

    def test_find_similar_enterprises(self):
        # Chercher une entreprise existante dans les documents
        self.svc._ensure_indexed()
        enterprise_doc = next(
            (d for d in self.svc._documents if d.get("doc_type") == "enterprise_profile"),
            None,
        )
        if enterprise_doc:
            doc_id = enterprise_doc["id"]
            results = self.svc.find_similar_enterprises(doc_id, top_k=3)
            self.assertIsInstance(results, list)
            for res in results:
                self.assertEqual(res.doc_type, "enterprise_profile")
                self.assertNotEqual(res.doc_id, doc_id)

    def test_find_upsell_candidates(self):
        self.svc._ensure_indexed()
        enterprise_doc = next(
            (d for d in self.svc._documents if d.get("doc_type") == "enterprise_profile"),
            None,
        )
        if enterprise_doc:
            doc_id = enterprise_doc["id"]
            results = self.svc.find_upsell_candidates(doc_id, service_not_having="Fibre", top_k=3)
            self.assertIsInstance(results, list)
            for res in results:
                self.assertEqual(res.upsell_service, "Fibre")


class MarketIntelTestCase(TestCase):
    """Tests unitaires du moteur de veille et du resolver."""

    def test_parse_date_robustness(self):
        self.assertEqual(_parse_date("2026-10-25"), "2026-10-25")
        parsed = _parse_date("Tue, 20 Oct 2026 14:30:00 +0000")
        self.assertEqual(parsed, "2026-10-20")

    def test_enterprise_resolver_new_account(self):
        resolver = EnterpriseResolver()
        signal = RawSignal(
            source_type="PRESS",
            source_url="https://zoom-eco.net/test-article",
            source_name="Presse Test",
            raw_text="Nouvelle entreprise miniere detectee",
            signal_date="2026-10-27",
        )
        enriched = {
            "company_name": "UniqueNewCompanyXYZ",
            "sector": "Mine",
            "city": "Kolwezi",
            "estimated_size": "PME",
            "opportunity_type": "NEW_PROSPECT",
            "opportunity_details": "Nouveau projet d'extraction miniere",
            "relevant_services": ["Liaison Satellite VSAT"],
            "relevance_score": 0.85,
        }
        resolver.resolve_and_save(enriched, signal)

        item = B2BNewsFeedItem.objects.filter(discovered_company_name="UniqueNewCompanyXYZ").first()
        self.assertIsNotNone(item)
        self.assertTrue(item.is_web_discovery)
        self.assertEqual(item.category, "NEW_ACCOUNT")
        self.assertEqual(item.priority, "HIGH")

    def test_enterprise_resolver_existing_account(self):
        ent = Enterprise.objects.create(
            name="Banque Commerciale Test",
            sector="Banque",
            city="Kinshasa",
        )
        resolver = EnterpriseResolver()
        signal = RawSignal(
            source_type="PRESS",
            source_url="https://7sur7.cd/banque-test",
            source_name="7sur7 CD",
            raw_text="Banque Commerciale Test ouvre 5 agences",
            signal_date="2026-10-27",
        )
        enriched = {
            "company_name": "Banque Commerciale Test",
            "sector": "Banque",
            "city": "Kinshasa",
            "opportunity_type": "UPSELL",
            "opportunity_details": "Extension d'agences necessitant la fibre",
            "relevant_services": ["Fibre Dediee Pro"],
            "relevance_score": 0.9,
        }
        resolver.resolve_and_save(enriched, signal)

        item = B2BNewsFeedItem.objects.filter(enterprise=ent).first()
        self.assertIsNotNone(item)
        self.assertFalse(item.is_web_discovery)
        self.assertEqual(item.category, "TECH_PROJECT")


class VectorEndpointsTestCase(TestCase):
    """Tests des endpoints REST DRF."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="kam_test",
            password="password123",
            role="KAM",
        )

    def test_vector_search_endpoint(self):
        resp = self.client.post("/api/ai/vector/search/", {"query": "cybersecurite cloud", "n_results": 2})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["query"], "cybersecurite cloud")
        self.assertIn("results", data)
        self.assertLessEqual(len(data["results"]), 2)

    def test_vector_search_empty_query(self):
        resp = self.client.post("/api/ai/vector/search/", {"query": ""})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enterprise_similar_endpoint_query(self):
        resp = self.client.post("/api/ai/vector/similar-enterprises/", {"query_text": "banque finance", "top_k": 3})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("results", data)

    def test_market_intel_discover_endpoint(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post("/api/ai/vector/market-intel/discover/", {"query": "expansion kinshasa"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["status"], "started")

    def test_vector_reindex_endpoint(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post("/api/ai/vector/reindex/", {})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["status"], "done")
        self.assertGreaterEqual(data["indexed"], 1)
