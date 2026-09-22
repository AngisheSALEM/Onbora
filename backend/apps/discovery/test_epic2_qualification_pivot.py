from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from accounts.models import User
from sales.models import Enterprise, AccountPortfolioAssignment, SourceObservation, Evidence
from discovery.models import QualificationRecord, HandoffDossier
from discovery.strategies.registry import get_qualification_strategy
from discovery.strategies.soho_strategy import SohoQualificationStrategy
from discovery.strategies.pme_strategy import PmeQualificationStrategy
from discovery.strategies.kam_strategy import KamQualificationStrategy
from discovery.services.pivot_service import SegmentPivotService


class Epic2QualificationAndPivotTestCase(APITestCase):
    """
    Test suite for Epic 2: Multi-Segment Qualification Strategies,
    Segment Pivot Engine (SOHO -> PME / KAM), and Handoff Lifecycle.
    """

    def setUp(self):
        # Users
        self.soho_sales = User.objects.create_user(
            username='sales_soho', password='password123', role=User.SALESPERSON
        )
        self.kam_user = User.objects.create_user(
            username='kam_sector', password='password123', role=User.KAM
        )

        self.soho_token = Token.objects.create(user=self.soho_sales)
        self.kam_token = Token.objects.create(user=self.kam_user)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.soho_token.key}')

        # Enterprises
        self.enterprise_soho = Enterprise.objects.create(
            name="Boulangerie Centrale",
            sector="Commerce",
            segment="SOHO"
        )
        self.enterprise_pme = Enterprise.objects.create(
            name="Logistique Express SAS",
            sector="Transport",
            segment="PME",
            assigned_kam=self.kam_user
        )

    def test_strategies_factory_and_questions(self):
        strategy_soho = get_qualification_strategy("SOHO")
        self.assertIsInstance(strategy_soho, SohoQualificationStrategy)
        self.assertEqual(strategy_soho.segment_code, "SOHO")

        strategy_pme = get_qualification_strategy("PME")
        self.assertIsInstance(strategy_pme, PmeQualificationStrategy)
        self.assertEqual(strategy_pme.segment_code, "PME")

        strategy_kam = get_qualification_strategy("KAM")
        self.assertIsInstance(strategy_kam, KamQualificationStrategy)
        self.assertEqual(strategy_kam.segment_code, "KAM")

    def test_soho_validation_and_pivot_detection(self):
        strategy = SohoQualificationStrategy()

        # Incomplete answers (missing decider present)
        invalid_answers = {
            "soho_activity": "Commerce de détail & Boutique",
            "soho_eligibility": "Fibre optique existante / Raccordée"
        }
        is_valid, errors = strategy.validate_answers(invalid_answers)
        self.assertFalse(is_valid)
        self.assertIn("L'indication de présence du décideur (soho_decider_present) est obligatoire.", errors)

        # Valid normal SOHO answers (no pivot)
        valid_soho = {
            "soho_activity": "Commerce de détail & Boutique",
            "soho_eligibility": "Fibre optique existante / Raccordée",
            "soho_decider_present": True,
            "workstations_count": 3,
            "multisite": False
        }
        is_valid, _ = strategy.validate_answers(valid_soho)
        self.assertTrue(is_valid)
        pivot = strategy.detect_segment_pivot(valid_soho)
        self.assertIsNone(pivot)

        # Option A: SOHO remains 100% SOHO even with variations (zero artificial pivot to KAM)
        answers_large_ws = {
            "soho_activity": "Commerce de détail & Boutique",
            "soho_eligibility": "Fibre optique existante / Raccordée",
            "soho_decider_present": True,
            "workstations_count": 18,
            "multisite": False
        }
        self.assertIsNone(strategy.detect_segment_pivot(answers_large_ws))

        answers_multisite = {
            "soho_activity": "Artisanat & Bâtiment",
            "soho_eligibility": "Connexion 4G / 5G Box uniquement",
            "soho_decider_present": True,
            "workstations_count": 4,
            "multisite": True
        }
        self.assertIsNone(strategy.detect_segment_pivot(answers_multisite))

    def test_pme_pivot_to_kam_detection(self):
        strategy = PmeQualificationStrategy()
        pivot_pme = {
            "pme_workstations_count": 350,
            "pme_sites_count": 8,
            "pme_business_apps": ["ERP central (SAP, Sage, Odoo, Cegid)"],
            "pme_cloud_hosting": "Cloud Public (Microsoft Azure, AWS, GCP)",
            "pme_telecom_budget": 8500.0
        }
        pivot = strategy.detect_segment_pivot(pivot_pme)
        self.assertIsNotNone(pivot)
        self.assertEqual(pivot["target_segment"], "KAM")

    def test_pivot_service_submits_autonomous_soho(self):
        """Option A: SOHO is qualified directly by field sales with zero pivot to KAM."""
        soho_answers = {
            "soho_activity": "Commerce de détail & Boutique",
            "soho_eligibility": "Fibre optique existante / Raccordée",
            "soho_decider_present": True,
            "workstations_count": 5,
            "multisite": False,
            "estimated_monthly_telecom_spend": 120.0
        }

        result = SegmentPivotService.submit_and_evaluate_qualification(
            enterprise_id=self.enterprise_soho.id,
            user=self.soho_sales,
            answers=soho_answers,
            notes="Boutique qualifiée en direct par le commercial terrain."
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["pivot_triggered"])
        self.assertEqual(result["effective_segment"], "SOHO")
        self.assertIsNone(result["handoff_id"])

        # Verify Enterprise remains SOHO
        self.enterprise_soho.refresh_from_db()
        self.assertEqual(self.enterprise_soho.segment, "SOHO")

        # Verify QualificationRecord created as COMPLETED
        qual = QualificationRecord.objects.get(id=result["qualification_id"])
        self.assertEqual(qual.status, "COMPLETED")
        self.assertFalse(qual.pivot_triggered)

    def test_pme_pivot_triggers_grand_compte_handoff(self):
        """PME exceeding thresholds triggers KAM Grand Compte handoff."""
        answers_pme_large = {
            "pme_workstations_count": 350,
            "pme_sites_count": 8,
            "pme_business_apps": ["ERP central (SAP, Sage, Odoo, Cegid)"],
            "pme_cloud_hosting": "Cloud Public (Microsoft Azure, AWS, GCP)",
            "pme_telecom_budget": 8500.0
        }

        result = SegmentPivotService.submit_and_evaluate_qualification(
            enterprise_id=self.enterprise_pme.id,
            user=self.kam_user,
            answers=answers_pme_large,
            notes="Bascule PME vers Grand Compte (350 postes, 8 sites)."
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["pivot_triggered"])
        self.assertEqual(result["effective_segment"], "KAM")
        self.assertIsNotNone(result["handoff_id"])
        self.assertEqual(result["handoff_status"], "PENDING")

    def test_handoff_accept_and_return_workflow(self):
        # Create a pending handoff
        qualification = QualificationRecord.objects.create(
            enterprise=self.enterprise_soho,
            conducted_by=self.soho_sales,
            initial_segment="SOHO",
            effective_segment="PME",
            pivot_triggered=True,
            pivot_reason="Plus de 10 postes",
            status="PIVOTED"
        )
        handoff = HandoffDossier.objects.create(
            enterprise=self.enterprise_soho,
            qualification=qualification,
            from_user=self.soho_sales,
            from_role="SOHO_REPRESENTATIVE",
            target_segment="PME",
            status="PENDING",
            transfer_notes="Demande d'étude interconnexion 3 boutiques"
        )

        # KAM accepts handoff
        accept_res = SegmentPivotService.accept_handoff(
            handoff_id=str(handoff.id),
            kam_user=self.kam_user,
            notes="Dossier validé et pris en charge."
        )
        self.assertTrue(accept_res["success"])
        self.assertEqual(accept_res["status"], "ACCEPTED")

        handoff.refresh_from_db()
        self.assertEqual(handoff.status, "ACCEPTED")
        self.assertEqual(handoff.decided_by, self.kam_user)
        self.assertIsNotNone(handoff.decided_at)

        # Verify Enterprise assigned KAM
        self.enterprise_soho.refresh_from_db()
        self.assertEqual(self.enterprise_soho.assigned_kam, self.kam_user)

        # Verify Portfolio Assignment
        assignment = AccountPortfolioAssignment.objects.filter(
            enterprise=self.enterprise_soho,
            assignment_type='PRIMARY_KAM'
        ).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.user, self.kam_user)
        self.assertTrue(assignment.is_active)

    def test_handoff_api_endpoints(self):
        # 1. GET questions endpoint
        url_questions = reverse('discovery-questions') + "?segment=SOHO"
        res_q = self.client.get(url_questions)
        self.assertEqual(res_q.status_code, status.HTTP_200_OK)
        self.assertEqual(res_q.data["segment_code"], "SOHO")
        self.assertGreater(len(res_q.data["questions"]), 0)

        # 2. POST qualification submit endpoint for SOHO (Autonomous, zero pivot)
        url_submit = reverse('qualification-submit')
        payload_soho = {
            "enterprise_id": self.enterprise_soho.id,
            "answers": {
                "soho_activity": "Commerce de détail & Boutique",
                "soho_eligibility": "Fibre optique existante / Raccordée",
                "soho_decider_present": True,
                "workstations_count": 5,
                "multisite": False
            },
            "notes": "Établissement qualifié directement en SOHO."
        }
        res_sub = self.client.post(url_submit, payload_soho, format='json')
        self.assertEqual(res_sub.status_code, status.HTTP_200_OK)
        self.assertFalse(res_sub.data["pivot_triggered"])
        self.assertEqual(res_sub.data["effective_segment"], "SOHO")
        self.assertIsNone(res_sub.data["handoff_id"])

        # 3. Create a Handoff directly for PME to test KAM handoff API endpoints
        qualification = QualificationRecord.objects.create(
            enterprise=self.enterprise_pme,
            conducted_by=self.kam_user,
            initial_segment="PME",
            effective_segment="KAM",
            pivot_triggered=True,
            pivot_reason="Effectif > 250 postes",
            status="PIVOTED"
        )
        handoff = HandoffDossier.objects.create(
            enterprise=self.enterprise_pme,
            qualification=qualification,
            from_user=self.soho_sales,
            from_role="SOHO_REPRESENTATIVE",
            target_segment="KAM",
            status="PENDING",
            transfer_notes="Étude Grand Compte requise"
        )

        # 4. GET handoffs list endpoint as KAM
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.kam_token.key}')
        url_handoffs = reverse('handoff-dossier-list')
        res_list = self.client.get(url_handoffs)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res_list.data), 1)

        # 5. POST accept handoff endpoint as KAM
        url_accept = reverse('handoff-accept', kwargs={'pk': str(handoff.id)})
        res_acc = self.client.post(url_accept, {"notes": "Validé par le KAM"}, format='json')
        self.assertEqual(res_acc.status_code, status.HTTP_200_OK)
        self.assertEqual(res_acc.data["status"], "ACCEPTED")
