from __future__ import annotations

from unittest.mock import MagicMock, patch
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.ai_core.rag_service import get_catalog_rag
from apps.ai_core.unified_engine import get_unified_core_ai
from apps.ai_core.pre_call.models import PreCallInput, PreCallOutput
from apps.ai_core.post_call.models import PostCallInput, PostCallOutput
from apps.ai_core.lead_scoring.models import LeadScoringInput, LeadScoringOutput
from apps.ai_core.churn_radar.models import ChurnRadarInput, ChurnRadarOutput


class CatalogRAGTestCase(TestCase):
    """Tests du RAG Catalogue Orange Business."""

    def setUp(self):
        self.rag = get_catalog_rag()

    def test_catalog_rag_search(self):
        results = self.rag.search("fibre securisee", limit=3)
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("service_id", results[0])
        self.assertIn("name", results[0])

    def test_catalog_rag_get_service(self):
        results = self.rag.search("internet", limit=1)
        if results:
            service_id = results[0]["service_id"]
            svc = self.rag.get_service_by_id(service_id)
            self.assertIsNotNone(svc)
            self.assertEqual(svc.get("service_id"), service_id)

    def test_catalog_rag_non_existent_service(self):
        svc = self.rag.get_service_by_id("non_existent_service_xyz")
        self.assertIsNone(svc)


class UnifiedCoreAITestCase(TestCase):
    """Tests du moteur unifié Core AI In-Process."""

    def setUp(self):
        self.core_ai = get_unified_core_ai()

    def test_engines_initialized(self):
        self.assertIsNotNone(self.core_ai.pre_call_engine)
        self.assertIsNotNone(self.core_ai.post_call_engine)
        self.assertIsNotNone(self.core_ai.lead_scoring_engine)
        self.assertIsNotNone(self.core_ai.churn_radar_engine)
        self.assertIsNotNone(self.core_ai.sales_enrichment_engine)

    def test_pre_call_fallback_generation(self):
        inp = PreCallInput(
            company_name="Clinique Saint-Luc Test",
            sector="SANTE",
            locations_count=2,
            current_operator="Autre",
            current_connectivity="ADSL",
        )
        output = self.core_ai.pre_call_engine._build_fallback(inp, ["Fibre Dédiée Pro 50 Mbps"])
        self.assertIsInstance(output, PreCallOutput)
        self.assertEqual(output.company_overview.digital_maturity, "MEDIUM")
        self.assertGreaterEqual(len(output.key_decision_makers), 1)
        self.assertGreaterEqual(len(output.critical_discovery_questions), 1)

    def test_lead_scoring_evaluation(self):
        inp = LeadScoringInput(
            company_name="Banque BGFIBank Test",
            sector="BANQUE",
            locations_count=8,
            annual_revenue=1500000.0,
            decision_maker_accessible=True,
            current_contract_expiry_months=2,
            budget_status="CONFIRMED",
            detected_intent="HIGH",
        )
        output = self.core_ai.lead_scoring_engine.evaluate(inp)
        self.assertIsInstance(output, LeadScoringOutput)
        self.assertGreaterEqual(output.lead_score, 0)
        self.assertIsNotNone(output.scoring_tier)

    def test_churn_radar_analysis(self):
        inp = ChurnRadarInput(
            company_name="Entreprise Test Churn",
            current_services=["Fibre Pro"],
            recent_interactions_notes="Client se plaint d'interruptions et envisage un changement.",
            unresolved_incidents_count=4,
        )
        output = self.core_ai.churn_radar_engine.analyze(inp)
        self.assertIsInstance(output, ChurnRadarOutput)
        self.assertGreaterEqual(output.churn_score, 0)
        self.assertIsNotNone(output.retention_plan)


class AICoreAPITestCase(TestCase):
    """Tests des endpoints REST DRF du Core AI (/api/v1/ai/...)."""

    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint(self):
        response = self.client.get("/api/v1/ai/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "healthy")
        self.assertTrue(response.data.get("rag_available"))

    def test_catalog_search_endpoint(self):
        response = self.client.post("/api/v1/ai/catalog/search/", {"query": "cybersecurite", "limit": 2}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(response.data.get("count", 0), 1)

    def test_pre_call_endpoint(self):
        payload = {
            "company_name": "Cabinet Dentaire Dr Ilunga",
            "sector": "SANTE",
            "locations_count": 1,
        }
        response = self.client.post("/api/v1/ai/pre-call/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("company_overview", response.data)
        self.assertIn("key_decision_makers", response.data)
        self.assertIn("custom_pitch_angles", response.data)

    def test_lead_scoring_endpoint(self):
        payload = {
            "company_name": "Société Minière Test",
            "sector": "MINES",
            "locations_count": 3,
            "annual_revenue": 500000.0,
            "decision_maker_accessible": True,
            "current_contract_expiry_months": 3,
            "budget_status": "CONFIRMED",
            "detected_intent": "HIGH",
        }
        response = self.client.post("/api/v1/ai/lead-scoring/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("lead_score", response.data)
        self.assertIn("scoring_tier", response.data)

    def test_churn_radar_endpoint(self):
        payload = {
            "company_name": "Supermarché Kinshasa",
            "current_services": ["Fibre Pro 50 Mbps"],
            "recent_interactions_notes": "Le gérant signale 3 coupures ce mois-ci et retarde le paiement.",
            "unresolved_incidents_count": 3,
        }
        response = self.client.post("/api/v1/ai/churn-radar/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("churn_risk_level", response.data)
        self.assertIn("retention_plan", response.data)
