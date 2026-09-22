from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from accounts.models import User
from sales.models import Enterprise, AccountProjection, AccountPortfolioAssignment, SourceObservation, Evidence
from kam.models import RelationshipCoverage
from kam.services.relationship_service import RelationshipCoverageService


class Epic1PortfolioAndCoverageTestCase(APITestCase):
    """
    Test suite for Epic 1: DDD Projections, Portfolio Assignments,
    Source Observation / Evidence Chain, and Relationship Coverage / Mono-Champion Detection.
    """

    def setUp(self):
        self.kam_user = User.objects.create_user(
            username='kam_lead', password='password123', role=User.KAM
        )
        self.kam_token = Token.objects.create(user=self.kam_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.kam_token.key}')

        self.enterprise = Enterprise.objects.create(
            name="Alpha Corp PME",
            sector="Industrie",
            segment="PME"
        )

    def test_relationship_service_mono_champion_detection(self):
        # 1. Create a single champion coverage record
        coverage_champ = RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Alice Champion",
            contact_role="DSI",
            contact_email="alice@alphacorp.com",
            role_classification='CHAMPION',
            influence_level='HIGH'
        )

        # Evaluate diagnostic
        diag = RelationshipCoverageService.evaluate_account_relationship_coverage(self.enterprise.id)

        self.assertTrue(diag["is_mono_champion_risk"])
        self.assertEqual(diag["champions_count"], 1)
        self.assertEqual(diag["economic_buyers_count"], 0)
        self.assertIn("Acheteur Économique (DG, DAF)", diag["missing_critical_roles"])

        # Reload coverage from db to verify flag was updated
        coverage_champ.refresh_from_db()
        self.assertTrue(coverage_champ.is_mono_champion_risk)
        self.assertEqual(coverage_champ.coverage_status, 'SINGLE_POINT_OF_FAILURE')

        # 2. Add an Economic Buyer
        RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Bob Buyer",
            contact_role="DAF",
            contact_email="bob@alphacorp.com",
            role_classification='ECONOMIC_BUYER',
            influence_level='HIGH'
        )

        diag_after = RelationshipCoverageService.evaluate_account_relationship_coverage(self.enterprise.id)
        self.assertFalse(diag_after["is_mono_champion_risk"])
        self.assertEqual(diag_after["economic_buyers_count"], 1)

        coverage_champ.refresh_from_db()
        self.assertFalse(coverage_champ.is_mono_champion_risk)

    def test_relationship_diagnostic_api_endpoint(self):
        RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Alice Champion",
            contact_role="DSI",
            contact_email="alice@alphacorp.com",
            role_classification='CHAMPION',
            influence_level='HIGH'
        )

        url = reverse('kam-relationships-diagnostic', kwargs={'enterprise_id': self.enterprise.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_mono_champion_risk"])
        self.assertEqual(response.data["enterprise_id"], self.enterprise.id)

    def test_account_projection_and_portfolio_assignment(self):
        projection = AccountProjection.objects.create(
            enterprise=self.enterprise,
            crm_account_id="DYN-PME-9876",
            source_version="2026.09.21",
            raw_crm_payload={"accountnumber": "DYN-PME-9876", "statecode": 0}
        )
        self.assertEqual(projection.crm_account_id, "DYN-PME-9876")

        assignment = AccountPortfolioAssignment.objects.create(
            enterprise=self.enterprise,
            user=self.kam_user,
            assignment_type='PRIMARY_KAM',
            is_active=True
        )
        self.assertEqual(assignment.assignment_type, 'PRIMARY_KAM')

        url = reverse('portfolio-assignment-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_source_observation_and_evidence(self):
        obs = SourceObservation.objects.create(
            enterprise=self.enterprise,
            source_uri="https://dynamics.contoso.com/api/data/v9.2/accounts(123)",
            source_type='CRM_ACTIVITY',
            observed_at=timezone.now(),
            excerpt_text="Contrat Télécom expire le 31-12-2026",
            captured_by=self.kam_user
        )
        self.assertTrue(obs.excerpt_hash)

        evidence = Evidence.objects.create(
            enterprise=self.enterprise,
            observation=obs,
            statement="Contrat en cours arrivant à échéance sous 90 jours",
            kind='FACT',
            confidence_score=0.98,
            review_status='CONFIRMED',
            reviewed_by=self.kam_user
        )
        self.assertEqual(evidence.kind, 'FACT')
        self.assertEqual(evidence.observation.id, obs.id)
