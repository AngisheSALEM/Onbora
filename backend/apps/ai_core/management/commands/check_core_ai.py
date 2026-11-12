"""Operator probe; never print credentials or fall back to a made-up success."""
import json
from time import monotonic
from django.core.management.base import BaseCommand, CommandError
from apps.ai_core.common.base_engine import BaseAIEngine


class Command(BaseCommand):
    help = 'Vérifie la configuration Core AI ; --live effectue un appel Gemini minimal.'

    def add_arguments(self, parser):
        parser.add_argument('--live', action='store_true')

    def handle(self, *args, **options):
        engine = BaseAIEngine()
        result = {'model': engine.model_name, 'key_configured': bool(engine.api_key),
                  'client_ready': engine._client is not None}
        if options['live']:
            start = monotonic()
            reply = engine.call_gemini_json('Return only the JSON object {"ok":true}.')
            result.update(live_ok=reply == {'ok': True},
                          elapsed_seconds=round(monotonic() - start, 2),
                          inference=engine.last_inference_status)
        self.stdout.write(json.dumps(result))
        if options['live'] and not result['live_ok']:
            raise CommandError('Gemini n’a pas renvoyé de réponse JSON valide. Consulter le statut du diagnostic.')
