"""
Management command: compile_sector_rules
=========================================
Domaine : AI Core / Catalogue Orange Business
Rôle : Déclenche la compilation des règles de scoring sectorielles à partir
du catalogue de solutions actif (catalog.json).
"""

from __future__ import annotations

from pathlib import Path
from django.core.management.base import BaseCommand
from apps.ai_core.services.sector_rules_compiler import SectorRulesCompiler, RULES_OUTPUT_PATH


class Command(BaseCommand):
    help = "Compile les règles de scoring sectorielles (poids, paniers d'offres et pénalités) à partir du catalogue actif."

    def add_arguments(self, parser):
        parser.add_argument(
            "--catalog",
            type=str,
            default=None,
            help="Chemin vers un catalogue JSON spécifique.",
        )
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Chemin du fichier JSON de sortie compilé.",
        )

    def handle(self, *args, **options):
        catalog_path = Path(options["catalog"]) if options.get("catalog") else None
        output_path = Path(options["output"]) if options.get("output") else None

        self.stdout.write(self.style.NOTICE("Compilation des règles sectorielles depuis le catalogue..."))
        result = SectorRulesCompiler.compile(catalog_path=catalog_path, output_path=output_path)
        
        target = output_path or RULES_OUTPUT_PATH
        self.stdout.write(
            self.style.SUCCESS(
                f"[SUCCÈS] Règles compilées pour {len(result['sectors'])} secteurs. Enregistré dans : {target}"
            )
        )
