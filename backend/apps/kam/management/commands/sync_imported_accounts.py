"""Backfill profile entries for accounts imported before feed publication existed."""
from django.core.management.base import BaseCommand
from django.db import transaction

from kam.services.imported_accounts import publish_imported_account
from sales.models import SeedImportRecord


class Command(BaseCommand):
    help = 'Rend les fiches importées disponibles dans les flux KAM.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        records = SeedImportRecord.objects.filter(enterprise__isnull=False)
        count = records.count()
        if options['apply']:
            for pk in list(records.values_list('pk', flat=True)):
                with transaction.atomic():
                    record = SeedImportRecord.objects.select_for_update(of=('self',)).select_related('enterprise').get(pk=pk)
                    publish_imported_account(record, record.enterprise)
            self.stdout.write(f'{count} fiches disponibles dans les flux KAM.')
        else:
            self.stdout.write(f'{count} fiches à raccorder. Utiliser --apply pour enregistrer.')
