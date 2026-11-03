import time
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from apps.ai_core.services.discovery_jobs import process_next_job


class Command(BaseCommand):
    help = "Process persistent AI discovery jobs, recovering expired leases."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process at most one job and exit.")

    def handle(self, *args, **options):
        try:
            while True:
                close_old_connections()
                processed = process_next_job()
                if options["once"]:
                    return
                if not processed:
                    time.sleep(2)
        except KeyboardInterrupt:
            self.stdout.write("AI worker stopped; an interrupted job resumes after lease expiry.")
