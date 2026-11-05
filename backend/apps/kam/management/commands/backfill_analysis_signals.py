"""Rebuild the signal ledger from retained, validated v2 research without external calls."""
from django.core.management.base import BaseCommand

from apps.ai_core.models import CompanyResearchJob
from apps.ai_core.company_analysis.http_client import ResearchError
from kam.services.analysis_signal_ingestion import retain_analysis_signals


class Command(BaseCommand):
    help = 'Historise les faits sourcés des recherches v2 déjà terminées (idempotent, hors réseau).'

    def handle(self, *args, **options):
        jobs = CompanyResearchJob.objects.filter(state='completed', applied_at__isnull=False,
            signal_run__isnull=True).order_by('applied_at')
        retained = skipped = 0
        for job in jobs.iterator(chunk_size=100):
            try:
                retained += retain_analysis_signals(job, job.response_data) is not None
            except ResearchError:
                skipped += 1
        self.stdout.write(f'Recherches historisées : {retained}. Contrats invalides ignorés : {skipped}.')
