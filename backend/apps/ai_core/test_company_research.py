import json
from datetime import timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from sales.models import Enterprise
from kam.models import PreCallBriefing
from .models import CompanyResearchJob
from .company_analysis.adapter import build_company_brief
from .company_analysis.http_client import ResearchError, ResearchHTTPClient, validate_contract
from .company_analysis.jobs import enqueue_research, ResearchConflict
from .company_analysis.worker import process_next_research


def observation():
    return json.loads((Path(settings.BASE_DIR) / "resources/evals/research-v2-fixture.json").read_text(encoding="utf-8"))


class ResearchTransportTests(SimpleTestCase):
    def test_fixture_and_request_follow_v2_schema(self):
        validate_contract("ResearchJob", observation())

    @patch("apps.ai_core.company_analysis.http_client.requests.request")
    def test_bearer_idempotency_and_redirects(self, request):
        response = request.return_value.__enter__.return_value
        response.status_code = 200
        response.headers = {"Retry-After": "3"}
        response.iter_content.return_value = [json.dumps(observation()).encode()]
        data, delay = ResearchHTTPClient(token="private-test-value").get("job_demo_001")
        self.assertEqual(data["schema_version"], "2.0")
        self.assertEqual(delay, 3)
        self.assertFalse(request.call_args.kwargs["allow_redirects"])
        self.assertEqual(request.call_args.kwargs["headers"]["Authorization"], "Bearer private-test-value")

    @patch("apps.ai_core.company_analysis.http_client.requests.request")
    def test_auth_error_is_not_retried_or_exposed(self, request):
        response = request.return_value.__enter__.return_value
        response.status_code, response.headers = 401, {}
        with self.assertRaises(ResearchError) as caught:
            ResearchHTTPClient(token="private-test-value").get("job_demo_001")
        self.assertEqual(caught.exception.code, "research_http_401")
        self.assertFalse(caught.exception.retryable)

    def test_external_http_origin_is_rejected(self):
        with self.assertRaises(ResearchError):
            ResearchHTTPClient(base_url="http://other.example", token="test")

    def test_unavailable_research_never_creates_evidence(self):
        brief = build_company_brief("Unknown")
        self.assertEqual(brief.identity_status, "not_found")
        self.assertIsNone(brief.company.rccm)
        self.assertEqual(brief.evidence, [])
        self.assertEqual(brief.lead_qualification.journeys, [])

    def test_unresolved_or_dangling_facts_are_not_promoted(self):
        result = observation()["result"]
        result["identity"]["status"] = "ambiguous"
        self.assertEqual(build_company_brief("Unknown", result=result).ai_summary.key_facts, [])
        result["identity"]["status"] = "probable"
        result["facts"][0]["evidence_ids"] = ["missing"]
        brief = build_company_brief("Unknown", result=result)
        self.assertEqual(len(brief.ai_summary.key_facts), 1)


class ResearchIntegrationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="research-kam", role="KAM")
        self.other = get_user_model().objects.create_user(username="research-other", role="KAM")
        self.enterprise = Enterprise.objects.create(name="Entreprise Démonstration Onbora",
            city="Kinshasa", website="https://example.com", assigned_kam=self.user, assigned_entity="KAM_OFFICE")
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.fake = MagicMock()

    def enqueue(self):
        return enqueue_research(self.user, self.enterprise, key="same-request")

    def test_idempotency_and_conflict(self):
        first = self.enqueue()
        self.assertEqual(self.enqueue().pk, first.pk)
        with self.assertRaises(ResearchConflict):
            enqueue_research(self.user, self.enterprise, key="same-request", operation="refresh")

    def test_http_flow_preserves_crm_and_builds_sourced_brief(self):
        url = f"/api/kam/pre-call/{self.enterprise.pk}/"
        with patch("apps.ai_core.company_analysis.http_client.requests.request") as transport:
            response = self.api.post(url, {}, format="json", HTTP_IDEMPOTENCY_KEY="ui-request")
            self.assertEqual(response.status_code, 202, response.data)
            transport.assert_not_called()
        job = CompanyResearchJob.objects.get()
        completed = observation()
        completed["operation"] = "refresh"
        self.fake.create.return_value = (completed, 1)
        self.assertTrue(process_next_research(self.fake))
        job.refresh_from_db()
        self.assertEqual(job.state, "completed", job.error_code)
        self.assertEqual(job.application_status, "applied")
        self.enterprise.refresh_from_db()
        self.assertFalse(self.enterprise.rccm)
        self.assertFalse(self.enterprise.contact_phone)
        brief = self.api.get(url)
        self.assertEqual(brief.status_code, 200, brief.data)
        self.assertEqual(len(brief.data["ai_summary"]["key_facts"]), 2)
        self.assertTrue(brief.data["evidence"][0]["relevant_excerpt"])
        self.assertEqual(brief.data["research_job"]["state"], "completed")
        self.assertFalse(process_next_research(self.fake))

    def test_unknown_post_outcome_reuses_the_same_remote_key(self):
        job = self.enqueue()
        self.fake.create.side_effect = ResearchError("research_transport_unavailable", True)
        process_next_research(self.fake)
        CompanyResearchJob.objects.filter(pk=job.pk).update(next_poll_at=timezone.now())
        self.fake.create.side_effect = None
        self.fake.create.return_value = (observation(), 1)
        process_next_research(self.fake)
        keys = [call.args[1] for call in self.fake.create.call_args_list]
        self.assertEqual(keys, [str(job.pk), str(job.pk)])

    def test_running_job_is_polled_without_another_creation(self):
        job = self.enqueue()
        running = observation()
        running.update(state="running", result=None, completed_at=None)
        self.fake.create.return_value = (running, 10)
        process_next_research(self.fake)
        job.refresh_from_db()
        self.assertGreater(job.next_poll_at, timezone.now())
        self.assertFalse(process_next_research(self.fake))
        CompanyResearchJob.objects.filter(pk=job.pk).update(next_poll_at=timezone.now())
        self.fake.get.return_value = (observation(), 1)
        process_next_research(self.fake)
        self.fake.create.assert_called_once()
        self.fake.get.assert_called_once_with("job_demo_001")

    def test_manual_correction_is_preserved(self):
        job = self.enqueue()
        PreCallBriefing.objects.create(enterprise=self.enterprise, kam=self.user,
            company_overview={"summary": "Correction KAM"}, analysis_data={"ai_summary": {"status": "kam_edited"}})
        self.fake.create.return_value = (observation(), 1)
        process_next_research(self.fake)
        job.refresh_from_db()
        self.assertEqual(job.application_status, "preserved_manual_edits")
        self.assertEqual(PreCallBriefing.objects.get().company_overview["summary"], "Correction KAM")

    def test_owner_and_account_permissions(self):
        job = self.enqueue()
        self.api.force_authenticate(self.other)
        self.assertEqual(self.api.get(f"/api/ai/research/jobs/{job.pk}/").status_code, 404)
        self.assertEqual(self.api.post(f"/api/ai/research/enterprises/{self.enterprise.pk}/", {}).status_code, 404)
        self.assertEqual(self.api.get(f"/api/kam/pre-call/{self.enterprise.pk}/").status_code, 404)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(f"/api/ai/research/jobs/{job.pk}/").status_code, (401, 403))

    def test_lease_prevents_two_workers_from_processing_same_job(self):
        from .company_analysis.worker import claim_research
        self.enqueue()
        self.assertIsNotNone(claim_research())
        self.assertIsNone(claim_research())

    def test_deadline_and_access_revocation_stop_collection(self):
        job = self.enqueue()
        CompanyResearchJob.objects.filter(pk=job.pk).update(created_at=timezone.now() - timedelta(minutes=6))
        process_next_research(self.fake)
        job.refresh_from_db()
        self.assertEqual(job.error_code, "research_deadline_exceeded")
        self.fake.create.assert_not_called()

    def test_invalid_citations_cannot_mutate_an_account(self):
        job = self.enqueue()
        data = observation()
        data["result"]["facts"][0]["evidence_ids"] = ["missing"]
        self.fake.create.return_value = (data, 1)
        process_next_research(self.fake)
        job.refresh_from_db()
        self.assertEqual(job.state, "failed")
        self.assertEqual(job.error_code, "research_unresolved_evidence")
        self.enterprise.refresh_from_db()
        self.assertFalse(self.enterprise.scraped_data)

    def test_inactive_user_does_not_trigger_research(self):
        job = self.enqueue()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        process_next_research(self.fake)
        job.refresh_from_db()
        self.assertEqual(job.error_code, "research_access_revoked")
        self.fake.create.assert_not_called()

    def test_generic_endpoint_accepts_targeted_fields_and_rejects_bad_input(self):
        url = f"/api/ai/research/enterprises/{self.enterprise.pk}/"
        response = self.api.post(url, {"requested_fields": ["business_contacts"]}, format="json")
        self.assertEqual(response.status_code, 202)
        self.assertEqual(CompanyResearchJob.objects.get().request_data["requested_fields"], ["business_contacts"])
        self.assertEqual(self.api.post(url, {"requested_fields": ["unknown"]}, format="json").status_code, 400)
        self.assertEqual(self.api.post(url, {"baseline_id": "invalid"}, format="json").status_code, 400)
