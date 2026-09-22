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
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username="test_kam_ia",
            password="testpass123",
            email="kam_ia@onbora.test",
        )
        self.client = APIClient()

    # -------------------------------------------------------------------------
    # Endpoints publics (AllowAny) — Santé et catalogue
    # -------------------------------------------------------------------------
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

    # -------------------------------------------------------------------------
    # Endpoints protégés — Pre-Call
    # -------------------------------------------------------------------------
    def test_pre_call_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
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

    def test_pre_call_endpoint_unauthenticated(self):
        payload = {"company_name": "Test", "sector": "MINES", "locations_count": 1}
        response = self.client.post("/api/v1/ai/pre-call/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — Post-Call
    # -------------------------------------------------------------------------
    def test_post_call_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "kam_name": "Marc Lemaire",
            "client_name": "Jean-Paul Kasongo",
            "client_role": "DSI",
            "company_name": "Tenke Fungurume Mining",
            "meeting_transcript": "Entretien productif avec le DSI. Ils veulent du SD-WAN pour leurs sites miniers.",
        }
        response = self.client.post("/api/v1/ai/post-call/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("client_followup_email", response.data)
        self.assertIn("crm_payload", response.data)
        self.assertIn("action_tasks", response.data)

    def test_post_call_endpoint_unauthenticated(self):
        payload = {
            "kam_name": "Test",
            "company_name": "Test",
            "meeting_transcript": "Test transcript",
        }
        response = self.client.post("/api/v1/ai/post-call/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — Lead Scoring
    # -------------------------------------------------------------------------
    def test_lead_scoring_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
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

    def test_lead_scoring_endpoint_unauthenticated(self):
        payload = {"company_name": "Test", "sector": "TEST", "locations_count": 1}
        response = self.client.post("/api/v1/ai/lead-scoring/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — Churn Radar
    # -------------------------------------------------------------------------
    def test_churn_radar_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
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

    def test_churn_radar_endpoint_unauthenticated(self):
        payload = {"company_name": "Test", "current_services": ["Fibre"]}
        response = self.client.post("/api/v1/ai/churn-radar/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — Sales Enrichment
    # -------------------------------------------------------------------------
    def test_sales_enrichment_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "company_name": "Rawbank RDC",
            "sector": "BANQUE",
            "website": "https://www.rawbank.com",
        }
        response = self.client.post("/api/v1/ai/sales-enrichment/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("hypotheses", response.data)
        self.assertIn("tailored_pitch", response.data)

    def test_sales_enrichment_endpoint_unauthenticated(self):
        payload = {"company_name": "Test", "sector": "TEST"}
        response = self.client.post("/api/v1/ai/sales-enrichment/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — HITL Validate
    # -------------------------------------------------------------------------
    def test_validate_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "session_id": "test_hitl_session",
            "decision": "approved",
            "comment": "Validé par le KAM après vérification terrain.",
        }
        response = self.client.post("/api/v1/ai/validate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("decision"), "approved")

    def test_validate_endpoint_unauthenticated(self):
        payload = {"session_id": "test", "decision": "approved"}
        response = self.client.post("/api/v1/ai/validate/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # -------------------------------------------------------------------------
    # Endpoints protégés — Session Detail
    # -------------------------------------------------------------------------
    def test_session_detail_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/ai/session/test_session_detail/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("session_id", response.data)
        self.assertIn("messages", response.data)

    def test_session_detail_endpoint_unauthenticated(self):
        response = self.client.get("/api/v1/ai/session/test_session/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class CompanyAnalysisTestCase(TestCase):
    """Tests du module d'analyse entreprise Onbora Analysis."""

    def setUp(self):
        from apps.ai_core.company_analysis.service import CompanyAnalysisClient
        self.client = CompanyAnalysisClient()

    def test_analysis_client_generates_valid_brief(self):
        brief = self.client.get_analysis_for_enterprise(
            company_name="Rawbank",
            sector="Banque commerciale",
            rccm="CD/KIN/RCCM/14-B-1088",
            province="Kinshasa",
            site_count=5
        )
        self.assertIsNotNone(brief)
        self.assertEqual(brief.company.legal_name, "RAWBANK SA")
        self.assertEqual(brief.identity_status, "confirmed")
        self.assertGreaterEqual(len(brief.lead_qualification.journeys), 1)
        self.assertTrue(bool(brief.ai_summary.overview.text))
        self.assertGreaterEqual(len(brief.evidence), 1)

    def test_unified_core_ai_generates_onbora_analysis_brief(self):
        core_ai = get_unified_core_ai()
        enterprise_mock = MagicMock()
        enterprise_mock.name = "Transit Congo"
        enterprise_mock.sector = "Transport & Logistique"
        enterprise_mock.city = "Kinshasa"
        enterprise_mock.crm_id = "ARSP-001"
        enterprise_mock.site_count = 2
        enterprise_mock.annual_revenue = 100000.0
        enterprise_mock.current_operator = "Concurrent"
        enterprise_mock.current_connectivity = "Radio"
        enterprise_mock.contact_name = "Directeur Logistique"

        kam_mock = MagicMock()
        kam_mock.username = "kam_test"
        kam_mock.get_full_name.return_value = "Test KAM"

        brief = core_ai.generate_pre_call_briefing(enterprise_mock, kam_mock)
        self.assertIsInstance(brief, dict)
        self.assertIn("identity_status", brief)
        self.assertIn("lead_qualification", brief)
        self.assertIn("ai_summary", brief)
        self.assertIn("evidence", brief)
        self.assertIn("sources", brief)
