from django.core.management.base import BaseCommand

from apps.ai_core.market_intel.service import MarketIntelService


class Command(BaseCommand):
    help = "Lance la veille web B2B et alimente le fil d'actualite KAM"

    def add_arguments(self, parser):
        parser.add_argument(
            "--query",
            type=str,
            default="entreprises Kinshasa expansion",
            help="Requete de recherche pour la veille web",
        )
        parser.add_argument(
            "--enterprise",
            type=str,
            default="",
            help="Nom d'une entreprise cible pour une veille ciblee",
        )

    def handle(self, *args, **options):
        query = options["query"]
        enterprise = options["enterprise"].strip()

        service = MarketIntelService()

        if enterprise:
            self.stdout.write(
                self.style.NOTICE(f"Veille ciblee sur l'entreprise : {enterprise}")
            )
            stats = service.run_enrichment_for_enterprise(enterprise_name=enterprise)
        else:
            self.stdout.write(
                self.style.NOTICE(f"Lancement de la decouverte web avec la requete : {query}")
            )
            stats = service.run_discovery(query=query)

        self.stdout.write(self.style.SUCCESS(
            f"Resultat : {stats['collected']} collectes | "
            f"{stats['enriched']} enrichis | "
            f"{stats['saved']} sauvegardes | "
            f"{len(stats.get('errors', []))} erreurs"
        ))
        if stats.get("errors"):
            for err in stats["errors"]:
                self.stderr.write(self.style.ERROR(f"  Erreur : {err}"))
