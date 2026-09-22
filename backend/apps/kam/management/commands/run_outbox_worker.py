"""
Command run_outbox_worker
=========================
Usage :
  python manage.py run_outbox_worker --once
  python manage.py run_outbox_worker --interval 5
"""

import time
import sys
from django.core.management.base import BaseCommand
from kam.integrations.dynamics.worker import DynamicsOutboxWorker


class Command(BaseCommand):
    help = "Exécute le worker d'outbox asynchrone pour synchroniser les opérations vers Microsoft Dynamics 365 Dataverse."

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Exécute un seul cycle de synchronisation et quitte immédiatement (adapté aux cron jobs / tests).'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Nombre maximal d\'opérations à traiter par lot (défaut : 10).'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Intervalle en secondes entre deux vérifications en mode continu (défaut : 5).'
        )

    def handle(self, *args, **options):
        once = options.get('once', False)
        batch_size = options.get('batch_size', 10)
        interval = options.get('interval', 5)

        worker = DynamicsOutboxWorker()
        self.stdout.write(self.style.NOTICE(f"[OUTBOX WORKER] Démarrage du worker Dynamics 365 (batch={batch_size}, once={once})..."))

        try:
            while True:
                processed = worker.process_pending_operations(batch_size=batch_size)
                if processed > 0:
                    self.stdout.write(self.style.SUCCESS(f"[OUTBOX WORKER] {processed} opération(s) synchronisée(s) vers Dynamics 365."))

                if once:
                    break

                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("[OUTBOX WORKER] Arrêt du worker demandé par l'utilisateur."))
            sys.exit(0)
