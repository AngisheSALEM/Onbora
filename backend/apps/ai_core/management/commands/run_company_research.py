import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from apps.ai_core.company_analysis.worker import process_next_research


class Command(BaseCommand):
    help = "Submit and follow persistent company research jobs (no paid calls from web requests)."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")

    def handle(self, *args, **options):
        try:
            while True:
                close_old_connections()
                processed = process_next_research()
                if not options["loop"]:
                    return
                if not processed:
                    time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write("Research worker stopped.")
