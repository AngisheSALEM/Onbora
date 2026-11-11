from django.core.management.base import BaseCommand
from sales.services.demo_installed_catalog import seed_installed_catalog


class Command(BaseCommand):
    help = 'Renseigne le parc des comptes de démonstration depuis le catalogue local, sans modifier les données CRM réelles.'

    def handle(self, *args, **options):
        result = seed_installed_catalog()
        self.stdout.write(self.style.SUCCESS(f'Parc de démonstration : {result}'))
