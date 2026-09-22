from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from accounts.models import User
from sales.models import Enterprise, AccountProjection
from kam.models import KamVisitReport, SyncOperation
from kam.integrations.dynamics.client import DataverseClient
from kam.integrations.dynamics.worker import DynamicsOutboxWorker


class Epic4DynamicsOutboxTestCase(APITestCase):
    """
    Test suite for Epic 4: Dataverse Anti-Corruption Layer,
    Transactional PostgreSQL Outbox and Async Worker.
    """

    def setUp(self):
        self.kam_user = User.objects.create_user(
            username='kam_dynamics_lead', password='password123', role=User.KAM
        )
        self.token = Token.objects.create(user=self.kam_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.enterprise = Enterprise.objects.create(
            name="Société Minière du Katanga",
            sector="Mines",
            segment="PME",
            assigned_kam=self.kam_user,
            annual_revenue=1500000.00
        )

        self.report = KamVisitReport.objects.create(
            kam=self.kam_user,
            enterprise=self.enterprise,
            executive_summary="Entretien stratégique : renouvellement de la liaison SD-WAN.",
            confirmed_needs=["SD-WAN 500M", "Sauvegarde souveraine"],
            objections_raised=["Délai de déploiement"],
            actions_todo=["Transmettre proposition SLA"],
            conversion_status="IN_NEGOTIATION"
        )

    def test_dataverse_client_simulation(self):
        client = DataverseClient(simulation_mode=True)

        # Account sync
        acc_res = client.sync_account(self.enterprise.id, {"name": self.enterprise.name})
        self.assertEqual(acc_res["status"], "succeeded")
        self.assertIn("accountid", acc_res)
        self.assertIn("@odata.etag", acc_res)

        # Appointment sync
        app_res = client.sync_visit_appointment({"subject": "RDV Découverte"})
        self.assertEqual(app_res["status"], "succeeded")
        self.assertIn("activityid", app_res)

    def test_outbox_worker_processes_account_and_updates_projection(self):
        op = SyncOperation.objects.create(
            target_system='DYNAMICS_365',
            entity_type='ACCOUNT',
            entity_id=str(self.enterprise.id),
            operation='UPSERT',
            payload={
                "name": self.enterprise.name,
                "revenue": float(self.enterprise.annual_revenue),
                "address1_city": self.enterprise.city
            },
            status='PENDING'
        )

        worker = DynamicsOutboxWorker(client=DataverseClient(simulation_mode=True))
        processed = worker.process_pending_operations(batch_size=10)

        self.assertEqual(processed, 1)

        op.refresh_from_db()
        self.assertEqual(op.status, 'SUCCEEDED')
        self.assertTrue(op.remote_id)
        self.assertIsNotNone(op.completed_at)

        # Verification of AccountProjection DDD model
        proj = AccountProjection.objects.filter(enterprise=self.enterprise).first()
        self.assertIsNotNone(proj)
        self.assertEqual(proj.crm_account_id, op.remote_id)
        self.assertEqual(proj.sync_status, 'IN_SYNC')

    def test_post_call_sync_crm_view_enqueues_and_processes(self):
        url = reverse('kam-visit-sync-crm', kwargs={'report_id': self.report.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["outbox_status"], "SUCCEEDED")
        self.assertTrue(response.data["outbox_operation_id"])

        # Check database records
        self.report.refresh_from_db()
        self.assertEqual(self.report.crm_sync_status, 'SYNCED_DYNAMICS')
        self.assertIsNotNone(self.report.synced_at)

        sync_op = SyncOperation.objects.get(id=response.data["outbox_operation_id"])
        self.assertEqual(sync_op.status, 'SUCCEEDED')
        self.assertEqual(sync_op.entity_type, 'APPOINTMENT')

    def test_worker_retry_on_transient_error(self):
        class FailingClient(DataverseClient):
            def sync_account(self, enterprise_id, payload):
                raise Exception("Connexion distante temporairement interrompue (HTTP 503)")

        op = SyncOperation.objects.create(
            target_system='DYNAMICS_365',
            entity_type='ACCOUNT',
            entity_id=str(self.enterprise.id),
            operation='UPSERT',
            payload={"name": self.enterprise.name},
            status='PENDING',
            max_retries=3
        )

        failing_worker = DynamicsOutboxWorker(client=FailingClient(simulation_mode=True))

        # 1st attempt fails -> status remains PENDING with retry_count = 1
        processed = failing_worker.process_pending_operations(batch_size=5)
        self.assertEqual(processed, 0)

        op.refresh_from_db()
        self.assertEqual(op.status, 'PENDING')
        self.assertEqual(op.retry_count, 1)
        self.assertIn("HTTP 503", op.last_error)

        # Force max_retries reached -> reset scheduled_at to now and retry
        op.retry_count = 2
        op.scheduled_at = timezone.now() - timedelta(seconds=1)
        op.save()

        failing_worker.process_pending_operations(batch_size=5)
        op.refresh_from_db()
        self.assertEqual(op.status, 'FAILED')
        self.assertEqual(op.retry_count, 3)
