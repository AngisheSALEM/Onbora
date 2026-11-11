from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from accounts.models import User
from sales.models import Enterprise, EnterpriseInstalledOffer, AccountProjection
from sales.services.demo_installed_catalog import seed_installed_catalog, catalog_services
from kam.models import KamVisitReport
from kam.services.enterprise_comparison_service import EnterpriseComparisonService as Comparison


class DemoInstalledCatalogTests(TestCase):
    def setUp(self):
        self.account = Enterprise.objects.create(
            name='Scénario minier', crm_id='CRM-CD-0008', sector='Mines & Énergie',
            segment='GRAND_COMPTE', employee_count=3500, site_count=2,
        )

    def test_offers_come_from_local_catalog_and_rerun_is_idempotent(self):
        first = seed_installed_catalog()
        version, definitions, _ = catalog_services()
        offers = list(self.account.installed_offers.select_related('service'))
        self.assertGreater(len(offers), 0)
        self.assertTrue(all(offer.is_demo and offer.service_id for offer in offers))
        self.assertTrue(all(offer.installed_offer_name in {s.name for s in definitions.values()} for offer in offers))
        snapshot = [(o.pk, o.demo_key, o.bandwidth_mbps, o.active_licenses_count) for o in offers]
        second = seed_installed_catalog()
        self.assertEqual(second['created'], 0)
        self.assertEqual(second['updated'], len(offers))
        self.assertEqual(snapshot, [(o.pk, o.demo_key, o.bandwidth_mbps, o.active_licenses_count) for o in self.account.installed_offers.all()])
        self.account.refresh_from_db()
        self.assertTrue(self.account.existing_crm_data['catalog_demo']['is_demo'])

    def test_manual_and_imported_parks_are_preserved(self):
        manual = EnterpriseInstalledOffer.objects.create(enterprise=self.account, installed_offer_name='Contrat terrain réel')
        imported = Enterprise.objects.create(name='CRM réel', crm_id='CRM-CD-0099')
        AccountProjection.objects.create(enterprise=imported, crm_account_id='existing-real-crm')
        result = seed_installed_catalog()
        self.assertEqual(result['skipped'], 1)
        self.assertEqual(self.account.installed_offers.count(), 1)
        self.assertTrue(EnterpriseInstalledOffer.objects.filter(pk=manual.pk, is_demo=False).exists())
        self.assertEqual(imported.installed_offers.count(), 0)

    def test_comparison_reads_the_same_seeded_bandwidth_and_flags_demo_data(self):
        seed_installed_catalog()
        peer = Enterprise.objects.create(name='Autre mine', sector='Mines & Énergie', crm_id='CRM-CD-0009', segment='GRAND_COMPTE')
        seed_installed_catalog()
        with patch.object(Comparison, 'get_sector_peers_by_sizing', return_value=[]):
            data = Comparison.compare(self.account.pk, peer.pk)
        bandwidth = self.account.installed_offers.get(sector_pillar_id='connectivity').bandwidth_mbps
        row = next(row for row in data['radar'] if row['dimension_id'] == 'connectivity')
        self.assertEqual(row['raw_val_a'], bandwidth)
        self.assertTrue(data['meta_a']['is_demo'])

    def test_enterprise_seed_does_not_delete_accounts_visits_or_assignments(self):
        kam = User.objects.create_user(username='preserved-kam', role=User.KAM)
        self.account.assigned_kam = kam; self.account.save()
        other = Enterprise.objects.create(name='Compte hors démonstration', crm_id='real-external-id')
        report = KamVisitReport.objects.create(enterprise=self.account, kam=kam, executive_summary='Visite à conserver')
        call_command('seed_1000_crm_enterprises', stdout=StringIO())
        self.account.refresh_from_db()
        self.assertEqual(self.account.name, 'Scénario minier')
        self.assertEqual(self.account.assigned_kam_id, kam.pk)
        self.assertTrue(Enterprise.objects.filter(pk=other.pk).exists())
        self.assertTrue(KamVisitReport.objects.filter(pk=report.pk).exists())
        self.assertEqual(Enterprise.objects.filter(crm_id__startswith='CRM-CD-').count(), 1000)
