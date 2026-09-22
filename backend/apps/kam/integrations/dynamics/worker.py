"""
Dynamics 365 Outbox Worker
==========================
Architecture : Transactional Outbox Worker
Rôle : Consomme les entrées de l'outbox PostgreSQL (`SyncOperation`) avec verrouillage
optimiste / pessimiste (`SELECT FOR UPDATE SKIP LOCKED`), et garantit la livraison
idempotente et ordonnée vers Microsoft Dynamics 365 Dataverse.
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List
from django.utils import timezone
from django.db import transaction
from kam.models import SyncOperation, KamVisitReport
from sales.models import Enterprise, AccountProjection
from .client import DataverseClient, DataverseClientException

logger = logging.getLogger(__name__)


class DynamicsOutboxWorker:
    def __init__(self, client: DataverseClient = None):
        self.client = client or DataverseClient()

    def process_pending_operations(self, batch_size: int = 10) -> int:
        """
        Traite un lot d'opérations en attente avec verrouillage `SKIP LOCKED`
        pour permettre l'exécution parallèle sécurisée sans concurrence.
        Retourne le nombre d'opérations traitées avec succès.
        """
        now = timezone.now()
        processed_count = 0

        with transaction.atomic():
            operations: List[SyncOperation] = list(
                SyncOperation.objects.select_for_update(skip_locked=True)
                .filter(status='PENDING', scheduled_at__lte=now)
                .order_by('scheduled_at')[:batch_size]
            )

            if not operations:
                return 0

            for op in operations:
                op.status = 'PROCESSING'
                op.save(update_fields=['status', 'updated_at'])

        # Exécution hors transaction longue pour ne pas bloquer les verrous lors des appels HTTP
        for op in operations:
            try:
                result = self._dispatch_operation(op)
                with transaction.atomic():
                    op.status = 'SUCCEEDED'
                    op.remote_id = (
                        result.get('accountid') or
                        result.get('activityid') or
                        result.get('contactid') or
                        result.get('id') or ''
                    )
                    op.completed_at = timezone.now()
                    op.save(update_fields=['status', 'remote_id', 'completed_at', 'updated_at'])

                    # Répercussion sur le modèle local concerné
                    self._on_success_callback(op, result)
                    processed_count += 1
            except Exception as e:
                with transaction.atomic():
                    op.retry_count += 1
                    op.last_error = str(e)

                    if op.retry_count >= op.max_retries:
                        op.status = 'FAILED'
                        logger.error(f"Outbox #{op.id} : échec définitif ({op.last_error})")
                    else:
                        op.status = 'PENDING'
                        # Backoff exponentiel (2s, 4s, 8s, 16s...)
                        delay_seconds = 2 ** op.retry_count
                        op.scheduled_at = timezone.now() + timedelta(seconds=delay_seconds)
                        logger.warning(f"Outbox #{op.id} : échec temporaire, prochain essai dans {delay_seconds}s ({op.last_error})")

                    op.save(update_fields=['status', 'retry_count', 'scheduled_at', 'last_error', 'updated_at'])

        return processed_count

    def _dispatch_operation(self, op: SyncOperation) -> Dict[str, Any]:
        """Aiguille l'opération vers l'appel Dataverse approprié."""
        if op.entity_type == 'ACCOUNT':
            return self.client.sync_account(int(op.entity_id), op.payload)
        elif op.entity_type == 'APPOINTMENT':
            return self.client.sync_visit_appointment(op.payload)
        elif op.entity_type == 'CONTACT':
            return self.client.sync_contact(op.payload)
        else:
            raise DataverseClientException(f"Type d'entité non pris en charge : {op.entity_type}")

    def _on_success_callback(self, op: SyncOperation, result: Dict[str, Any]):
        """Met à jour les projections locales ou rapports une fois la synchronisation confirmée."""
        if op.entity_type == 'APPOINTMENT':
            try:
                report = KamVisitReport.objects.filter(id=int(op.entity_id)).first()
                if report:
                    report.crm_sync_status = 'SYNCED_DYNAMICS'
                    report.synced_at = timezone.now()
                    report.save(update_fields=['crm_sync_status', 'synced_at'])
            except (ValueError, TypeError):
                pass
        elif op.entity_type == 'ACCOUNT':
            try:
                enterprise = Enterprise.objects.filter(id=int(op.entity_id)).first()
                if enterprise and op.remote_id:
                    AccountProjection.objects.update_or_create(
                        enterprise=enterprise,
                        defaults={
                            'crm_account_id': op.remote_id,
                            'source_system': 'DYNAMICS_365',
                            'source_version': result.get('@odata.etag', ''),
                            'raw_crm_payload': result,
                            'last_pushed_at': timezone.now(),
                            'sync_status': 'IN_SYNC'
                        }
                    )
            except (ValueError, TypeError):
                pass
