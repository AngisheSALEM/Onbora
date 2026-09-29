"""
Tests unitaires pour le Radar de Churn et de Rétention Portefeuille (Epic 5)
=============================================================================
Vérifie la robustesse du moteur déterministe, des snapshots, et des endpoints DRF.
"""

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from sales.models import Enterprise
from kam.models import (
    KamVisitReport,
    KamAppointment,
    ChurnRadarAssessment,
    ChurnRadarSnapshot,
)
from kam.services.churn_radar_service import ChurnRadarService

User = get_user_model()


class ChurnRadarTestCase(APITestCase):
    def setUp(self):
        self.kam_user = User.objects.create_user(
            username="kam_test",
            email="kam_test@orange.com",
            password="password123",
            role="KAM"
        )
        self.other_kam = User.objects.create_user(
            username="other_kam",
            email="other_kam@orange.com",
            password="password123",
            role="KAM"
        )

        today = timezone.now().date()

        # Compte 1 : À risque élevé (contrat < 30j, 2 incidents)
        self.ent_risk = Enterprise.objects.create(
            name="Banque Risque",
            sector="Banque & Finance",
            contract_end_date=today + timedelta(days=20),
            incident_count=2,
            pain_level="HIGH",
            assigned_kam=self.kam_user,
            telecom_budget_monthly=18000
        )

        # Compte 2 : Renouvellement à surveiller (< 90j, sain)
        self.ent_renewal = Enterprise.objects.create(
            name="Mining Renewal",
            sector="Mines & Métallurgie",
            contract_end_date=today + timedelta(days=60),
            incident_count=0,
            pain_level="LOW",
            assigned_kam=self.kam_user,
            telecom_budget_monthly=25000
        )

        # Compte 3 : Sain avec prochain RDV
        self.ent_healthy = Enterprise.objects.create(
            name="Industrie Saine",
            sector="Industrie",
            contract_end_date=today + timedelta(days=300),
            incident_count=0,
            pain_level="LOW",
            assigned_kam=self.kam_user,
            telecom_budget_monthly=12000
        )
        # Création d'un RDV futur
        KamAppointment.objects.create(
            enterprise=self.ent_healthy,
            kam=self.kam_user,
            title="Revue trimestrielle",
            scheduled_at=timezone.now() + timedelta(days=5),
            visit_purpose="FOLLOW_UP"
        )

        # Compte d'un autre KAM (test d'isolation)
        self.ent_other = Enterprise.objects.create(
            name="Autre Compte",
            sector="Services",
            assigned_kam=self.other_kam
        )

    def test_deterministic_scoring_rules(self):
        """Vérifie les déductions et bornages déterministes."""
        det_risk = ChurnRadarService.calculate_deterministic_health_score(self.ent_risk)

        # Base 100
        # -25 (< 30j)
        # -30 (2 incidents * 15)
        # -15 (pain HIGH)
        # -10 (inactivité par défaut > 30j)
        # Total attendu = 100 - 25 - 30 - 15 - 10 = 20
        self.assertLessEqual(det_risk["health_score"], 40)
        self.assertEqual(det_risk["risk_level"], "CRITICAL")
        self.assertEqual(det_risk["churn_risk_score"], 100 - det_risk["health_score"])
        self.assertTrue(det_risk["is_renewal_imminent"])

        # Compte sain avec RDV
        det_healthy = ChurnRadarService.calculate_deterministic_health_score(self.ent_healthy)
        self.assertGreaterEqual(det_healthy["health_score"], 70)
        self.assertEqual(det_healthy["risk_level"], "LOW")

    def test_assessment_persistence_and_snapshot(self):
        """Vérifie la création et persistance de ChurnRadarAssessment et ChurnRadarSnapshot."""
        assessment = ChurnRadarService.refresh_account_assessment(self.ent_risk, use_ai=False)
        self.assertIsNotNone(assessment.id)
        self.assertEqual(assessment.enterprise, self.ent_risk)

        # Vérification snapshot
        snapshots = ChurnRadarSnapshot.objects.filter(enterprise=self.ent_risk)
        self.assertTrue(snapshots.exists())
        self.assertEqual(snapshots.first().health_score, assessment.health_score)

    def test_portfolio_summary_and_isolation(self):
        """Vérifie que le résumé de portefeuille respecte l'isolation par KAM."""
        summary = ChurnRadarService.get_portfolio_summary(self.kam_user)
        self.assertIn("summary_cards", summary)
        self.assertIn("milestones", summary)
        self.assertIn("priority_accounts", summary)

        cards = summary["summary_cards"]
        self.assertGreaterEqual(cards["high_risk"]["count"], 1)
        self.assertGreaterEqual(cards["renewals"]["count"], 1)

        # Vérifie qu'aucun compte de l'autre KAM n'apparaît dans priority_accounts
        other_names = [a["name"] for a in summary["priority_accounts"] if a["name"] == "Autre Compte"]
        self.assertEqual(len(other_names), 0)

    def test_drf_endpoints(self):
        """Vérifie que tous les endpoints DRF répondent avec un statut 200 OK."""
        self.client.force_authenticate(user=self.kam_user)

        urls = [
            "/api/kam/portfolio-summary/",
            "/api/kam/churn-radar/risk/",
            "/api/kam/churn-radar/renewals/",
            "/api/kam/churn-radar/upsell/",
            "/api/kam/churn-radar/no-action/",
            f"/api/kam/accounts/{self.ent_risk.id}/radar/",
        ]

        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK, f"Échec sur {url}: {response.data}")
