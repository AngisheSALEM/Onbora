from django.core.management import call_command
from django.core.management.base import BaseCommand
from accounts.models import User
from catalog.models import ServiceCatalog
from sales.models import Plaque, Enterprise, SegmentationConfig


class Command(BaseCommand):
    help = "Provisionne l'intégralité du système Onbora en production (Catalogue, Utilisateurs démo, Plaques et Banque de 1000 Entreprises CRM)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-users',
            action='store_true',
            help='Ne pas réinitialiser les utilisateurs démo si des comptes de production existent déjà.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== PROVISIONING GLOBAL ONBORA PRODUCTION ==="))

        # 1. Catalogue des offres Orange B2B MSP
        self.stdout.write(self.style.NOTICE("\n1. Initialisation du Catalogue de Services MSP..."))
        call_command('seed_catalog')

        # 2. Utilisateurs & Personas démo
        if options['skip_users'] and User.objects.filter(role=User.ADMIN).exists():
            self.stdout.write(self.style.WARNING("Option --skip-users active: Utilisateurs existants conserves."))
        else:
            self.stdout.write(self.style.NOTICE("\n2. Initialisation des Utilisateurs et Personas (Admin, Superviseur, KAM, Commerciaux)..."))
            call_command('seed_demo_users')

        # 3. Banque de 1 000 Entreprises Congolaises & Cartographie
        self.stdout.write(self.style.NOTICE("\n3. Peuplement de la Banque de 1 000 Entreprises Congolaises CRM..."))
        call_command('seed_1000_crm_enterprises')

        # 4. Rapport de vérification
        users_count = User.objects.count()
        services_count = ServiceCatalog.objects.count()
        plaques_count = Plaque.objects.count()
        enterprises_count = Enterprise.objects.count()
        gc_count = Enterprise.objects.filter(segment='GRAND_COMPTE').count()
        pme_count = Enterprise.objects.filter(segment='PME').count()
        tpe_count = Enterprise.objects.filter(segment='TPE_INFORMEL').count()

        self.stdout.write(self.style.SUCCESS(
            f"\n=== PROVISIONING TERMINE AVEC SUCCES ===\n"
            f"- Services Catalogue : {services_count}\n"
            f"- Utilisateurs Actifs : {users_count}\n"
            f"- Plaques Territoriales : {plaques_count}\n"
            f"- Total Banque Entreprises CRM : {enterprises_count}\n"
            f"  * Grands Comptes (KAM Office) : {gc_count}\n"
            f"  * PME (KAM Office) : {pme_count}\n"
            f"  * TPE / SOHO (Back-Office Terrain) : {tpe_count}\n"
        ))
