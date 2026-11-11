import time
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from accounts.dynamics_import_service import process_next_import


class Command(BaseCommand):
    help = 'Traite les imports Dynamics et programme les actualisations automatiques.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Traiter au plus une page puis quitter.')

    def handle(self, *args, **options):
        try:
            while True:
                close_old_connections()
                processed = process_next_import()
                if options['once']:
                    return
                if not processed:
                    time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write('Worker Dynamics arrêté. Les imports reprendront au dernier checkpoint.')
