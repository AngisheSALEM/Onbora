import json
import tempfile
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from sales.models import Enterprise
from .models import AISessionMemory, AIDiscoveryJob, AIVectorDocument
from .services.session_service import AISessionService, SessionConflict
from .vector_search.service import VectorSearchService


class VectorFixtureMixin:
    def make_vector_service(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        dataset = Path(folder.name) / "documents.jsonl"
        docs = [
            {"id": "enterprise_profile_1", "doc_type": "enterprise_profile", "title": "One",
             "content": "banque finance fibre", "metadata": {"enterprise_id": 1}},
            {"id": "enterprise_profile_2", "doc_type": "enterprise_profile", "title": "Two",
             "content": "banque fibre cloud", "metadata": {"enterprise_id": 2}},
            {"id": "catalog_1", "doc_type": "service_catalog", "title": "Fibre",
             "content": "fibre optique cybersecurite cloud", "metadata": {}},
        ]
        dataset.write_text("\n".join(json.dumps(d) for d in docs), encoding="utf-8")
        for name, value in (("JSONL_PATH", str(dataset)), ("CACHE_PATH", str(Path(folder.name) / "cache.json"))):
            mock = patch("apps.ai_core.vector_search.service." + name, value)
            mock.start()
            self.addCleanup(mock.stop)
        self.dataset = dataset
        return VectorSearchService()


class SessionSecurityTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username="owner", role="KAM")
        self.other = get_user_model().objects.create_user(username="other", role="KAM")
        self.session = AISessionService.get_or_create_session("private", user=self.owner)
        self.client = APIClient()
        self.client.force_authenticate(self.other)

    def test_other_user_cannot_read_validate_or_analyze_session(self):
        responses = [
            self.client.get("/api/ai/session/private/"),
            self.client.post("/api/ai/validate/", {"session_id": "private", "decision": "approved"}),
            self.client.post("/api/ai/analyze/", {"session_id": "private", "conversation": "Bonjour"}),
        ]
        self.assertEqual([r.status_code for r in responses], [404, 404, 404])
        self.session.refresh_from_db()
        self.assertEqual(self.session.messages, [])
        self.assertEqual(self.session.decision_status, "pending")

    def test_legacy_unowned_session_cannot_be_claimed(self):
        AISessionMemory.objects.create(session_id="legacy")
        response = self.client.post("/api/ai/analyze/", {"session_id": "legacy", "conversation": "Bonjour"})
        self.assertEqual(response.status_code, 404)

    def test_get_missing_session_does_not_create_one(self):
        self.assertEqual(self.client.get("/api/ai/session/missing/").status_code, 404)
        self.assertFalse(AISessionMemory.objects.filter(session_id="missing").exists())

    def test_missing_session_id_is_rejected(self):
        for path in ("analyze", "validate"):
            response = self.client.post(f"/api/ai/{path}/", {"conversation": "Bonjour", "decision": "approved"})
            self.assertEqual(response.status_code, 400)

    @patch("apps.ai_core.services.session_service.get_unified_core_ai")
    def test_fallback_does_not_invent_needs_and_history_is_sent(self, core):
        AISessionService.append_message("private", "user", "Notre budget est bloqué", user=self.owner)
        core.return_value._call_gemini_json.return_value = None
        result = AISessionService.analyze_and_record("private", "Client", "Bonjour", user=self.owner)
        self.assertEqual(result["analysis"]["detected_needs"], [])
        self.assertEqual(result["analysis"]["recommended_offers"], [])
        self.assertTrue(result["human_validation_required"])
        prompt = json.loads(core.return_value._call_gemini_json.call_args.kwargs["prompt"])
        self.assertEqual(prompt["history"][0]["content"], "Notre budget est bloqué")

    @patch("apps.ai_core.services.session_service.get_unified_core_ai")
    def test_concurrent_change_is_preserved_and_stale_analysis_rejected(self, core):
        def update(**kwargs):
            AISessionService.append_message("private", "user", "Concurrent", user=self.owner)
            return {"summary": "Stale"}
        core.return_value._call_gemini_json.side_effect = update
        with self.assertRaises(SessionConflict):
            AISessionService.analyze_and_record("private", "Client", "Original", user=self.owner)
        self.session.refresh_from_db()
        self.assertEqual([m["content"] for m in self.session.messages], ["Concurrent"])

    @patch("apps.ai_core.services.session_service.get_unified_core_ai")
    def test_new_analysis_resets_old_human_approval(self, core):
        AISessionService.validate_action("private", "approved", user=self.owner)
        core.return_value._call_gemini_json.return_value = {"summary": "Nouvelle analyse"}
        AISessionService.analyze_and_record("private", "Client", "Suite", user=self.owner)
        self.session.refresh_from_db()
        self.assertEqual(self.session.decision_status, "pending")
        self.assertTrue(self.session.human_validation_required)

    def test_history_is_bounded(self):
        self.session.messages = [{"role": "user", "content": str(i)} for i in range(50)]
        self.session.reports = [{"summary": str(i)} for i in range(30)]
        self.session.save()
        AISessionService.append_message("private", "user", "Latest", user=self.owner)
        AISessionService.add_report("private", {"summary": "Latest"}, user=self.owner)
        self.session.refresh_from_db()
        self.assertEqual(len(self.session.messages), AISessionService.MAX_MESSAGES)
        self.assertEqual(len(self.session.reports), AISessionService.MAX_REPORTS)


class VectorHardeningTests(VectorFixtureMixin, TestCase):
    def setUp(self):
        self.svc = self.make_vector_service()

    def test_identical_query_has_identical_embedding_even_with_provider_client(self):
        self.svc._client = MagicMock()
        results = self.svc.search("banque finance fibre")
        self.assertEqual(results[0].doc_id, "enterprise_profile_1")
        self.assertAlmostEqual(results[0].score, 1.0)
        self.svc._client.models.embed_content.assert_not_called()

    def test_cache_invalidated_when_document_content_changes(self):
        self.svc.search("banque")
        old = list(self.svc._vectors["enterprise_profile_1"])
        docs = [json.loads(line) for line in self.dataset.read_text().splitlines()]
        docs[0]["content"] = "sante hopital dossier patient"
        self.dataset.write_text("\n".join(json.dumps(d) for d in docs), encoding="utf-8")
        fresh = VectorSearchService()
        fresh.search("sante")
        self.assertNotEqual(fresh._vectors["enterprise_profile_1"], old)

    def test_legacy_or_wrong_dimension_cache_is_rebuilt(self):
        from .vector_search.service import CACHE_PATH
        Path(CACHE_PATH).write_text(json.dumps({"obsolete": [1.0]}), encoding="utf-8")
        self.svc.search("fibre")
        self.assertEqual(set(self.svc._vectors), {"enterprise_profile_1", "enterprise_profile_2", "catalog_1"})
        self.assertTrue(all(len(v) == 768 for v in self.svc._vectors.values()))

    def test_database_overlay_is_visible_in_another_service_and_after_restart(self):
        second = VectorSearchService()
        second.search("fibre")
        enterprise = Enterprise.objects.create(name="Sante Nouveau", sector="Sante", city="Kinshasa")
        self.svc.vectorize_enterprise(enterprise)
        doc_id = f"enterprise_profile_{enterprise.pk}"
        second.search("Sante Nouveau")
        self.assertEqual(next(d for d in second._documents if d["id"] == doc_id)["metadata"]["name"], "Sante Nouveau")
        self.assertTrue(AIVectorDocument.objects.filter(pk=doc_id).exists())
        fresh = VectorSearchService()
        fresh.search("Sante Nouveau")
        self.assertIn(doc_id, fresh._vectors)

    def test_authorization_applies_before_top_k(self):
        results = self.svc.search("banque finance fibre", n_results=1,
                                  document_filter=lambda d: d["id"] == "catalog_1")
        self.assertEqual([r.doc_id for r in results], ["catalog_1"])

    def test_compatibility_import_returns_the_same_singleton(self):
        from .vector_search.service import vector_search_service
        from .vector_search.singleton import get_vector_search_service
        self.assertIs(vector_search_service, get_vector_search_service())


class APIHardeningTests(VectorFixtureMixin, TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="kam", role="KAM")
        self.other = get_user_model().objects.create_user(username="other", role="KAM")
        self.svc = self.make_vector_service()
        mock = patch("apps.ai_core.vector_search.singleton.get_vector_search_service", return_value=self.svc)
        mock.start()
        self.addCleanup(mock.stop)

    def test_anonymous_cannot_search_internal_documents(self):
        for path in ("search", "similar-enterprises"):
            response = self.client.post(f"/api/ai/vector/{path}/", {"query": "banque", "query_text": "banque"})
            self.assertIn(response.status_code, (401, 403))

    def test_only_assigned_profiles_are_returned(self):
        own = Enterprise.objects.create(name="Own", assigned_kam=self.user)
        other = Enterprise.objects.create(name="Other", assigned_kam=self.other)
        self.svc.vectorize_enterprise(own)
        self.svc.vectorize_enterprise(other)
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/ai/vector/search/", {"query": "banque", "doc_type": "enterprise_profile"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["metadata"]["enterprise_id"] for r in response.data["results"]], [own.pk])
        response = self.client.post("/api/ai/vector/similar-enterprises/", {"enterprise_id": other.pk})
        self.assertEqual(response.status_code, 404)

    def test_invalid_limits_are_bad_requests(self):
        self.client.force_authenticate(self.user)
        for path, key, query in (("catalog/search", "limit", "query"), ("vector/search", "n_results", "query"),
                                 ("vector/similar-enterprises", "top_k", "query_text")):
            for value in ("abc", 0, -1, 10000):
                response = self.client.post(f"/api/ai/{path}/", {query: "fibre", key: value})
                self.assertEqual(response.status_code, 400, (path, value))

    def test_regular_kam_cannot_reindex(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post("/api/ai/vector/reindex/", {}).status_code, 403)


class InferenceBudgetTests(SimpleTestCase):
    def test_overloaded_model_uses_one_alternative(self):
        from google.genai import types
        from .common.inference import generate_with_budget
        client = MagicMock()
        error = RuntimeError('overloaded')
        error.code = 503
        client.models.generate_content.side_effect = [error, SimpleNamespace(text='{}')]
        generate_with_budget(client, model='first', contents='test', config=types.GenerateContentConfig(),
                             fallback_models=['second', 'third'])
        self.assertEqual(client.models.generate_content.call_count, 2)

    def test_rate_limit_is_not_multiplied_across_models(self):
        from google.genai import types
        from .common.inference import generate_with_budget
        client = MagicMock()
        error = RuntimeError("limited")
        error.code = 429
        client.models.generate_content.side_effect = error
        with self.assertRaises(RuntimeError):
            generate_with_budget(client, model="first", contents="test", config=types.GenerateContentConfig(),
                                 fallback_models=["second", "third"])
        self.assertEqual(client.models.generate_content.call_count, 1)

    def test_fallback_receives_only_remaining_budget(self):
        from google.genai import types
        from .common.inference import generate_with_budget
        error = RuntimeError("missing model")
        error.code = 404
        client = MagicMock()
        client.models.generate_content.side_effect = [error, SimpleNamespace(text="{}")]
        with patch("apps.ai_core.common.inference.monotonic", side_effect=[0, 0, 15]):
            generate_with_budget(client, model="first", contents="test", config=types.GenerateContentConfig(),
                                 budget_ms=20000, fallback_models=["second"])
        configs = [call.kwargs["config"] for call in client.models.generate_content.call_args_list]
        self.assertEqual([c.http_options.timeout for c in configs], [20000, 5000])


class DiscoveryQueueTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="worker-owner", role="KAM")

    def test_enqueue_is_persistent_deduplicated_and_bounded(self):
        from .services.discovery_jobs import enqueue_discovery
        from rest_framework.exceptions import Throttled
        first = enqueue_discovery(self.user, "expansion")
        self.assertEqual(enqueue_discovery(self.user, "expansion").pk, first.pk)
        enqueue_discovery(self.user, "second")
        enqueue_discovery(self.user, "third")
        with self.assertRaises(Throttled):
            enqueue_discovery(self.user, "fourth")

    def test_job_is_claimed_once_and_expired_lease_is_recovered(self):
        from .services.discovery_jobs import enqueue_discovery, claim_job
        job = enqueue_discovery(self.user, "expansion")
        claimed = claim_job()
        self.assertEqual(claimed.pk, job.pk)
        self.assertIsNone(claim_job())
        AIDiscoveryJob.objects.filter(pk=job.pk).update(lease_expires_at=timezone.now() - timedelta(seconds=1))
        reclaimed = claim_job()
        self.assertEqual(reclaimed.pk, job.pk)
        self.assertNotEqual(reclaimed.lease_token, claimed.lease_token)
        self.assertEqual(reclaimed.attempts, 2)

    @patch("apps.ai_core.market_intel.service.MarketIntelService")
    def test_worker_persists_result_and_status(self, service):
        from .services.discovery_jobs import enqueue_discovery, process_next_job
        service.return_value.run_discovery.return_value = {"saved": 2, "errors": []}
        job = enqueue_discovery(self.user, "expansion")
        self.assertTrue(process_next_job())
        job.refresh_from_db()
        self.assertEqual(job.status, "succeeded")
        self.assertEqual(job.result["saved"], 2)
        self.assertIsNone(job.lease_token)

    def test_job_status_is_private(self):
        from .services.discovery_jobs import enqueue_discovery
        job = enqueue_discovery(self.user, "expansion")
        client = APIClient()
        other = get_user_model().objects.create_user(username="queue-other", role="KAM")
        client.force_authenticate(other)
        self.assertEqual(client.get(f"/api/ai/vector/market-intel/jobs/{job.pk}/").status_code, 404)

    @patch("apps.ai_core.market_intel.service.MarketIntelService")
    def test_failures_stop_after_three_attempts(self, service):
        from .services.discovery_jobs import enqueue_discovery, process_next_job
        service.return_value.run_discovery.side_effect = RuntimeError("offline")
        job = enqueue_discovery(self.user, "expansion")
        with self.assertLogs("apps.ai_core.services.discovery_jobs", level="ERROR"):
            for _ in range(3):
                self.assertTrue(process_next_job())
        job.refresh_from_db()
        self.assertEqual(job.status, "failed")
        self.assertEqual(job.attempts, 3)
        self.assertFalse(process_next_job())

    def test_replayed_signal_does_not_create_duplicate_feed_items(self):
        from .market_intel.resolver import EnterpriseResolver
        from .market_intel.collectors.rss_collector import RawSignal
        from kam.models import B2BNewsFeedItem
        signal = RawSignal("PRESS", "https://example.test/article", "Test", "Unique Company expands", "2026-11-03")
        enriched = {"company_name": "Unique Company", "opportunity_details": "Expansion", "relevance_score": 0.8}
        resolver = EnterpriseResolver()
        self.assertTrue(resolver.resolve_and_save(enriched, signal))
        self.assertFalse(resolver.resolve_and_save(enriched, signal))
        self.assertEqual(B2BNewsFeedItem.objects.count(), 1)


class EvidenceTests(TestCase):
    def test_technical_sheet_contains_no_invented_network_or_needs(self):
        from .unified_engine import get_unified_core_ai
        enterprise = Enterprise.objects.create(name="Unknown")
        sheet = get_unified_core_ai().generate_technical_sheet(enterprise, solutions=[], confirmed_needs=[])
        self.assertEqual(sheet["confirmed_needs"], [])
        self.assertEqual(sheet["network_configuration"]["wan"], {})
        self.assertEqual(sheet["equipment_list"], [])
        self.assertEqual(sheet["enterprise"]["contact_phone"], "")
        self.assertTrue(sheet["human_validation_required"])

    def test_old_generated_technical_sheet_is_not_reused(self):
        from kam.models import PreCallBriefing
        from kam.commercial_intelligence_service import CommercialIntelligenceService
        user = get_user_model().objects.create_user(username="technical-kam", role="KAM")
        enterprise = Enterprise.objects.create(name="Legacy sheet", assigned_kam=user)
        PreCallBriefing.objects.create(enterprise=enterprise, kam=user, analysis_data={
            "technical_specs": {"network_configuration": {"wan": {"ip_address": "invented"}}}})
        sheet = CommercialIntelligenceService.get_or_generate_technical_sheet(enterprise, user)
        self.assertEqual(sheet["schema_version"], "evidence-1")
        self.assertEqual(sheet["network_configuration"]["wan"], {})

    def test_scoring_does_not_depend_on_company_name_or_unknown_budget(self):
        from .unified_engine import get_unified_core_ai
        from .lead_scoring.models import LeadScoringInput
        engine = get_unified_core_ai().lead_scoring_engine
        first = engine._build_fallback(LeadScoringInput(company_name="A", budget_status="Non précisé"))
        second = engine._build_fallback(LeadScoringInput(company_name="B", budget_status="Non précisé"))
        self.assertEqual(first.lead_score, second.lead_score)
        confirmed = engine._build_fallback(LeadScoringInput(company_name="A", budget_status="Confirmé"))
        self.assertGreater(confirmed.lead_score, first.lead_score)
        self.assertNotEqual(first.conversion_probability.value, "HIGH")

    @patch("apps.ai_core.company_analysis.sync_service.ChurnRadarService")
    def test_sync_does_not_invent_strong_score_or_evidence(self, churn):
        from .company_analysis.sync_service import OnboraAnalysisSyncService
        churn.calculate_deterministic_health_score.return_value = {}
        churn.refresh_account_assessment.side_effect = RuntimeError("unavailable")
        enterprise = Enterprise.objects.create(name="Unknown", segment="GRAND_COMPTE")
        OnboraAnalysisSyncService().reanalyze_enterprise_with_core_ai(enterprise, {"result": {}})
        self.assertNotEqual(enterprise.ai_lead_scoring_data["conversion_probability"], "HIGH")
        self.assertNotEqual(enterprise.conversion_score, 85)
        self.assertEqual(enterprise.ai_hypotheses, [])
        self.assertEqual(enterprise.ai_churn_data["upsell"], [])
