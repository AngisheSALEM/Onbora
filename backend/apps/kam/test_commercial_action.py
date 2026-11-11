import uuid
from unittest import TestCase as UnitTestCase

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.ai_core.services.commercial_action import build_commercial_action
from kam.models import B2BNewsFeedItem
from sales.models import Enterprise


class CommercialActionContractTests(UnitTestCase):
    def test_preserves_recorded_analysis_and_only_exposes_page_fields(self):
        result = build_commercial_action(
            company_name=" Entreprise Alpha ", commercial_angle=" Ouverture annoncée de deux sites. ",
            signal_rationale="Raison secondaire", recommended_offer="Interconnexion des sites",
            recommended_action="Qualifier les besoins avec la direction technique.",
        )
        self.assertEqual(result, {
            "company_name": "Entreprise Alpha",
            "interest_reason": "Ouverture annoncée de deux sites.",
            "recommended_solution": "Interconnexion des sites",
            "next_action": "Qualifier les besoins avec la direction technique.",
        })

    def test_missing_analysis_requires_qualification_without_inventing_an_offer(self):
        result = build_commercial_action(company_name=None, recommended_offer=None)
        self.assertEqual(result["company_name"], "Entreprise")
        self.assertIn("qualifier", result["interest_reason"])
        self.assertIn("à définir", result["recommended_solution"])

    def test_rationale_is_used_when_commercial_angle_is_empty(self):
        result = build_commercial_action(company_name="Alpha", commercial_angle=" ",
                                         signal_rationale="Extension annoncée.")
        self.assertEqual(result["interest_reason"], "Extension annoncée.")


class CommercialActionAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.kam = user_model.objects.create_user(username="action-kam", role="KAM")
        cls.other_kam = user_model.objects.create_user(username="action-other", role="KAM")
        cls.client_user = user_model.objects.create_user(username="action-client", role="CLIENT")
        cls.admin = user_model.objects.create_user(username="action-admin", role="ADMIN")
        cls.enterprise = Enterprise.objects.create(name="Portefeuille Alpha", assigned_kam=cls.other_kam)
        cls.lead = B2BNewsFeedItem.objects.create(
            title="Extension", summary="Deux nouvelles implantations annoncées.",
            is_web_discovery=True, discovered_company_name="Alpha",
            commercial_angle="Interconnexion à étudier entre les sites.",
            recommended_offer="Réseau inter-sites", recommended_action="Qualifier les usages.",
        )
        cls.portfolio = B2BNewsFeedItem.objects.create(
            title="Projet", summary="Nouveau site", enterprise=cls.enterprise,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.kam)

    def url(self, item):
        return f"/api/kam/feed/{item.id}/commercial-action/"

    def test_returns_lead_analysis_in_one_query_without_mutation(self):
        with self.assertNumQueries(1):
            response = self.client.get(self.url(self.lead))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "Alpha")
        self.assertEqual(response.data["interest_reason"], self.lead.commercial_angle)
        self.assertEqual(response.data["recommended_solution"], self.lead.recommended_offer)
        self.assertEqual(response.data["next_action"], self.lead.recommended_action)
        self.assertTrue(response.data["can_add_to_portfolio"])
        self.assertFalse(response.data["is_in_portfolio"])
        self.lead.refresh_from_db()
        self.assertFalse(self.lead.is_read)
        self.assertFalse(self.lead.is_converted_to_portfolio)

    def test_unknown_news_returns_404(self):
        response = self.client.get(f"/api/kam/feed/{uuid.uuid4()}/commercial-action/")
        self.assertEqual(response.status_code, 404)

    def test_converted_lead_cannot_be_added_again(self):
        self.lead.is_converted_to_portfolio = True
        self.lead.save(update_fields=["is_converted_to_portfolio"])
        response = self.client.get(self.url(self.lead))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["can_add_to_portfolio"])
        self.assertTrue(response.data["is_in_portfolio"])

    def test_other_kam_portfolio_is_not_accessible(self):
        self.assertEqual(self.client.get(self.url(self.portfolio)).status_code, 404)

    def test_admin_can_read_portfolio_analysis(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url(self.portfolio))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "Portefeuille Alpha")
        self.assertFalse(response.data["can_add_to_portfolio"])
        self.assertTrue(response.data["is_in_portfolio"])

    def test_client_role_is_denied(self):
        self.client.force_authenticate(self.client_user)
        self.assertEqual(self.client.get(self.url(self.lead)).status_code, 403)

    def test_anonymous_is_denied(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url(self.lead)).status_code, (401, 403))
