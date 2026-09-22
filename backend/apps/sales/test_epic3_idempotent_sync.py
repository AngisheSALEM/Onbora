import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from accounts.models import User
from sales.models import Enterprise, VisitPreparation, VisitReport, IdempotencyRecord, AccountProjection


class Epic3IdempotentSyncTestCase(APITestCase):
    """
    Test suite for Epic 3: Mobile Outbox Idempotent Synchronization & Conflict Management.
    """

    def setUp(self):
        self.salesperson = User.objects.create_user(
            username='sales_rep_field', password='password123', role=User.SALESPERSON
        )
        self.token = Token.objects.create(user=self.salesperson)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.enterprise = Enterprise.objects.create(
            name="Pharmacie du Peuple",
            sector="Santé",
            segment="SOHO"
        )
        self.preparation = VisitPreparation.objects.create(
            enterprise=self.enterprise,
            salesperson=self.salesperson
        )
        self.url = reverse('visit-complete-idempotent')

    def test_complete_visit_first_call_creates_records(self):
        idempotency_key = str(uuid.uuid4())
        payload = {
            "enterprise_id": self.enterprise.id,
            "preparation_id": self.preparation.id,
            "executive_summary": "Visite de qualification fibre réalisée sur site.",
            "confirmed_needs": ["Liaison fibre stable", "Terminal de paiement mobile"],
            "objections_raised": ["Prix mensuel"],
            "actions_todo": ["Envoyer devis sous 24h"]
        }

        response = self.client.post(
            self.url,
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["enterprise_id"], self.enterprise.id)
        self.assertIsNotNone(response.data["report_id"])

        # Check database records
        self.assertTrue(VisitReport.objects.filter(id=response.data["report_id"]).exists())
        self.assertTrue(IdempotencyRecord.objects.filter(idempotency_key=idempotency_key).exists())

    def test_idempotent_replay_returns_cached_response(self):
        idempotency_key = str(uuid.uuid4())
        payload = {
            "enterprise_id": self.enterprise.id,
            "preparation_id": self.preparation.id,
            "executive_summary": "Entretien avec le gérant.",
            "confirmed_needs": ["Fibre"],
        }

        # 1. First execution
        res1 = self.client.post(
            self.url,
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        report_count_initial = VisitReport.objects.count()

        # 2. Replay with identical idempotency key (e.g. mobile reconnecting)
        res2 = self.client.post(
            self.url,
            payload,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data["report_id"], res1.data["report_id"])
        self.assertEqual(res2.headers.get("X-Cache-Lookup"), "HIT-IDEMPOTENCY")

        # Invariant: No duplicate reports created
        self.assertEqual(VisitReport.objects.count(), report_count_initial)

    def test_conflict_detection_returns_http_409(self):
        # Setup projection with source version "v2.0"
        AccountProjection.objects.create(
            enterprise=self.enterprise,
            crm_account_id="DYN-PHARMA-123",
            source_version="v2.0"
        )

        idempotency_key = str(uuid.uuid4())
        payload_stale = {
            "enterprise_id": self.enterprise.id,
            "preparation_id": self.preparation.id,
            "expected_version": "v1.0",  # Stale version from offline mobile
            "executive_summary": "Notes rédigées hors-ligne sur ancienne version."
        }

        response = self.client.post(
            self.url,
            payload_stale,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("Conflit de version détecté", response.data["detail"])
        self.assertEqual(response.data["server_version"], "v2.0")

    def test_complete_visit_with_qualification_pivot(self):
        idempotency_key = str(uuid.uuid4())
        payload_pivot = {
            "enterprise_id": self.enterprise.id,
            "preparation_id": self.preparation.id,
            "executive_summary": "Requalification : commerce avec 15 postes informatiques.",
            "qualification_answers": {
                "soho_activity": "Commerce de détail & Boutique",
                "soho_eligibility": "Fibre optique existante / Raccordée",
                "soho_decider_present": True,
                "workstations_count": 15,
                "multisite": False
            }
        }

        response = self.client.post(
            self.url,
            payload_pivot,
            format='json',
            HTTP_IDEMPOTENCY_KEY=idempotency_key
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["pivot_triggered"])
        self.assertEqual(response.data["effective_segment"], "PME")
        self.assertIsNotNone(response.data["handoff_id"])
