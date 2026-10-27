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
