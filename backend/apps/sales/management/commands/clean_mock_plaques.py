import logging
from django.core.management.base import BaseCommand
from sales.models import Plaque

logger = logging.getLogger(__name__)

MOCK_CODES = [
    'KIN-GOMBE',
    'KIN-LIMETE',
    'BZV-CENTRE',
    'PNR-CENTRE',
    'LSH-CENTRE',
    'ABJ-PLATEAU',
    'DKR-PLATEAU',
]


class Command(BaseCommand):
    help = "Nettoie et supprime les plaques mockees pour ne conserver que les zones tracees (GeoJSON)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--all-without-geojson',
            action='store_true',
            help='Supprime aussi toute plaque sans polygone GeoJSON trace',
        )

    def handle(self, *args, **options):
        self.stdout.write("Purge des plaques mockees en cours...")

        # 1. Supprimer les codes mock connus
        mock_qs = Plaque.objects.filter(code__in=MOCK_CODES)
        mock_count = mock_qs.count()
        mock_qs.delete()
        self.stdout.write(self.style.SUCCESS(f"{mock_count} plaque(s) mockee(s) par code supprimee(s)."))

        # 2. Supprimer les plaques sans GeoJSON si demande
        if options.get('all_without_geojson'):
            no_geo_qs = Plaque.objects.filter(boundary_geojson__in=[{}, None, ''])
            no_geo_count = no_geo_qs.count()
            no_geo_qs.delete()
            self.stdout.write(self.style.SUCCESS(f"{no_geo_count} plaque(s) sans GeoJSON supprimee(s)."))

        total_remaining = Plaque.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Nettoyage termine. {total_remaining} plaque(s) active(s) restante(s)."))
