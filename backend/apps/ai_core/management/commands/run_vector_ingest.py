from django.core.management.base import BaseCommand

from apps.ai_core.vector_search.singleton import get_vector_search_service


class Command(BaseCommand):
    help = "Indexe ou reindexe le dataset de vectorisation dans le moteur in-process"

    def add_arguments(self, parser):
        parser.add_argument(
            "--rebuild",
            action="store_true",
            help="Force la reconstruction complete de l'index vectoriel",
        )

    def handle(self, *args, **options):
        from sales.models import Enterprise
        from apps.ai_core.vector_search.documents import persist_enterprise_document
        last_id = 0
        while True:
            # Close each read cursor before writes; SQLite workers must not retain a
            # streaming read lock over the complete reindex operation.
            batch = list(Enterprise.objects.filter(pk__gt=last_id).order_by('pk')
                .select_related('seed_import', 'crm_record').prefetch_related('installed_offers')[:100])
            if not batch:
                break
            for enterprise in batch:
                persist_enterprise_document(enterprise)
            last_id = batch[-1].pk
        service = get_vector_search_service()
        rebuild = options["rebuild"]

        if rebuild:
            self.stdout.write(self.style.NOTICE("Reconstruction complete de l'index vectoriel..."))
        else:
            self.stdout.write(self.style.NOTICE("Indexation du dataset vectoriel..."))

        count = service.reindex()

        self.stdout.write(self.style.SUCCESS(
            f"Indexation terminee : {count} documents vectorises dans l'index in-process."
        ))
