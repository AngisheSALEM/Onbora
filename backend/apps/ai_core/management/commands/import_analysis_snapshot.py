"""Import selected registry profiles and attributable public research from SQLite."""
import json
import sqlite3
from django.core.management.base import BaseCommand, CommandError
from apps.ai_core.company_analysis.snapshot import import_snapshot


class Command(BaseCommand):
    help = 'Audit a read-only Analysis snapshot; --apply imports selection and researched companies.'

    def add_arguments(self, parser):
        parser.add_argument('--db', required=True)
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        try:
            result = import_snapshot(options['db'], apply=options['apply'])
        except (OSError, ValueError, sqlite3.DatabaseError) as exc:
            raise CommandError(str(exc)) from None
        self.stdout.write(json.dumps({'applied': options['apply'], **result}))
