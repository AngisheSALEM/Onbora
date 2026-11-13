"""Snapshot imports retain identities, commercial work and attributable observations."""
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
from django.test import TestCase
from accounts.models import User
from sales.models import Enterprise, SeedImportRecord
from .company_analysis.snapshot import import_snapshot, combine_research
from .company_analysis.adapter import supported_facts
from .company_analysis.briefing import read_briefing
from .test_company_research import observation
from .test_hardening import VectorFixtureMixin


class SnapshotTests(VectorFixtureMixin, TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'source.sqlite3'
        self.owner = User.objects.create_user(username='snapshot-kam', role='KAM')
        self.enterprise = Enterprise.objects.create(name='COPAK', sector='Commerce',
            assigned_kam=self.owner, employee_count=None, site_count=None, annual_revenue=None,
            current_connectivity='', city='')
        SeedImportRecord.objects.create(external_id='crm-existing', enterprise=self.enterprise,
            payload={'kind': 'company', 'source': 'fictional', 'is_fictitious': True,
                     'name': 'COPAK', 'sector': 'Commerce', 'registry': {'source_ref': 'FEC:copak'}})
        # A company import requires its CRM record; use lead identity to isolate merging.
        record = self.enterprise.seed_import
        record.payload.update(kind='lead', source='onbora', is_fictitious=False,
                              onbora={'source_ref': 'FEC:copak', 'instance': 'onbora'})
        record.save()
        result = observation()['result']
        result['subject']['name'] = 'COPAK'
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute('CREATE TABLE research_company (id TEXT, source_ref TEXT, name TEXT, alias TEXT, sector TEXT, subsector TEXT, province TEXT, city TEXT, address TEXT, activity TEXT, website TEXT, showcase TEXT, identifiers TEXT, sources TEXT)')
            connection.execute('INSERT INTO research_company VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                ('company-id', 'FEC:copak', 'COPAK', '', 'Commerce et distribution', '', 'Nord-Kivu',
                 'Beni', '', 'Exportation de produits agricoles', 'https://copak.example',
                 'commerce', '{"rccm":"CD/001"}', '[]'))
            connection.execute('CREATE TABLE research_researchjob (id TEXT, company_id TEXT, state TEXT, pipeline_version TEXT, completed_at TEXT, result TEXT)')
            connection.execute('INSERT INTO research_researchjob VALUES (?,?,?,?,?,?)',
                ('job-source', 'company-id', 'completed', 'public-ai-v1', '2026-11-10', json.dumps(result)))

    def test_dry_run_is_read_only_and_apply_is_idempotent(self):
        original = self.path.read_bytes()
        self.assertEqual(import_snapshot(self.path)['updated'], 1)
        self.enterprise.refresh_from_db()
        self.assertEqual(self.enterprise.city, '')
        import_snapshot(self.path, apply=True)
        self.enterprise.refresh_from_db()
        self.assertEqual(self.enterprise.city, 'Beni')
        self.assertEqual(self.enterprise.rccm, 'CD/001')
        self.assertEqual(self.enterprise.assigned_kam_id, self.owner.pk)
        self.assertEqual(len(supported_facts(self.enterprise.scraped_data)), 2)
        second = import_snapshot(self.path, apply=True)
        self.assertEqual(second['unchanged'], 1)
        self.assertEqual(Enterprise.objects.count(), 1)
        self.assertEqual(original, self.path.read_bytes())
        data = read_briefing(self.enterprise, self.owner)
        self.assertIn('Exportation', data['ai_summary']['overview']['text'])
        self.assertTrue(data['commercial_preparation']['solution_options'])
        self.assertEqual(data['predicted_needs'], [])

    def test_manual_fields_and_human_briefs_are_preserved(self):
        self.enterprise.city = 'Goma'
        self.enterprise.save()
        import_snapshot(self.path, apply=True)
        self.enterprise.refresh_from_db()
        self.assertEqual(self.enterprise.city, 'Goma')

    def test_multiple_results_keep_resolved_references_and_deduplicate(self):
        result = observation()['result']
        merged = combine_research([{'id': 'one', 'result': json.dumps(result)},
                                   {'id': 'two', 'result': json.dumps(result)}])
        self.assertEqual(len(supported_facts(merged)), 2)
        self.assertEqual(len(merged['facts']), 2)

    def test_unresolved_observations_do_not_become_facts(self):
        result = observation()['result']
        result['identity']['status'] = 'not_found'
        self.assertIsNone(combine_research([{'id': 'bad', 'result': json.dumps(result)}]))
