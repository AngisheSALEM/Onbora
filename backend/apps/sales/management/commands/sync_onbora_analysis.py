"""Django Management Command to synchronize Onbora Analysis Service research jobs into Onbora DB.
Usage:
    python manage.py sync_onbora_analysis [--limit 100] [--url http://127.0.0.1:8001]
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from ai_core.company_analysis.sync_service import OnboraAnalysisSyncService


class Command(BaseCommand):
    help = "Synchronise les 100 fiches de recherche Onbora Analysis avec Onbora DB, re-analyse Core AI, vectorisation et alimentation du fil d'actualité."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Nombre maximal de jobs à synchroniser (défaut : 100)"
        )
        parser.add_argument(
            "--url",
            type=str,
            default=None,
            help="URL du microservice onbora-analysis (défaut: http://127.0.0.1:8001)"
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        url = options["url"]

        self.stdout.write(self.style.NOTICE("============================================================"))
        self.stdout.write(self.style.NOTICE(f"Démarrage synchronisation Onbora Analysis (limit={limit})..."))
        self.stdout.write(self.style.NOTICE("============================================================"))

        service = OnboraAnalysisSyncService(base_url=url)
        stats = service.sync_all_jobs(limit=limit)

        self.stdout.write(self.style.SUCCESS("\n--- Bilan de Synchronisation Onbora Analysis ---"))
        self.stdout.write(f"- Jobs récupérés : {stats['total_jobs_fetched']}")
        self.stdout.write(self.style.SUCCESS(f"- Comptes existants mis à jour & ré-analysés : {stats['updated_accounts']}"))
        self.stdout.write(self.style.SUCCESS(f"- Nouveaux leads créés & vectorisés : {stats['created_new_leads']}"))
        self.stdout.write(self.style.WARNING(f"- Fiches ignorées car obsolètes : {stats['skipped_obsolete']}"))
        if stats['errors']:
            self.stdout.write(self.style.ERROR(f"- Erreurs : {stats['errors']}"))
        self.stdout.write(self.style.SUCCESS("Toutes les entreprises traitées ont été vectorisées (768D) et intégrées au feed d'actualité.\n"))
