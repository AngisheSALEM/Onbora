from unittest.mock import Mock, patch

from django.test import TestCase
from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.services.enterprise_comparison_service import EnterpriseComparisonService as Comparison


class ComparisonIdentityTests(TestCase):
    def setUp(self):
        self.source = Enterprise.objects.create(
            name='CongoPay Gateway & Fintech', sector='Fintech & Paiements Numériques',
            website='https://congopay.io', employee_count=50, site_count=1,
        )
        self.duplicate = Enterprise.objects.create(
            name='CongoPay Gateway & Fintech', sector=self.source.sector,
            website=self.source.website, employee_count=50, site_count=1,
        )
        self.peer = Enterprise.objects.create(name='Autre établissement', sector=self.source.sector, employee_count=60)
        vector = Mock()
        vector.find_similar_enterprises.return_value = []
        self.vector_patch = patch('apps.ai_core.vector_search.singleton.get_vector_search_service', return_value=vector)
        self.vector_patch.start()
        self.addCleanup(self.vector_patch.stop)

    def test_same_business_with_different_ids_is_excluded_from_peers_and_default_selection(self):
        result = Comparison.compare(self.source.pk)
        ids = {peer['id'] for peer in result['sector_peers']}
        self.assertNotIn(self.source.pk, ids)
        self.assertNotIn(self.duplicate.pk, ids)
        self.assertEqual(result['meta_b']['id'], self.peer.pk)

    def test_explicit_self_or_duplicate_selection_falls_back_to_sector_average(self):
        for reference in (self.source, self.duplicate):
            with self.subTest(reference=reference.pk):
                result = Comparison.compare(self.source.pk, reference.pk)
                self.assertIsNone(result['meta_b']['id'])
                self.assertTrue(result['is_benchmark_comparison'])
                self.assertFalse(result['meta_b'].get('is_twin', False))

    def test_case_spacing_accents_and_punctuation_do_not_hide_duplicate_names(self):
        self.duplicate.name = '  CONGOPAY Gateway - Fintech  '
        self.duplicate.save()
        ids = {peer['id'] for peer in Comparison.get_sector_peers_by_sizing(self.source)}
        self.assertNotIn(self.duplicate.pk, ids)

    def test_different_names_with_the_same_legal_identifier_are_excluded(self):
        self.source.nif = 'A-1234567'; self.source.save()
        self.duplicate.name = 'Autre nom commercial'
        self.duplicate.nif = 'a1234567'; self.duplicate.save()
        result = Comparison.compare(self.source.pk, self.duplicate.pk)
        self.assertTrue(result['is_benchmark_comparison'])
        self.assertNotIn(self.duplicate.pk, {p['id'] for p in result['sector_peers']})

    def test_peer_options_are_deduplicated_preferring_the_record_with_an_installed_park(self):
        duplicate_peer = Enterprise.objects.create(name=self.peer.name, sector=self.peer.sector, employee_count=60)
        EnterpriseInstalledOffer.objects.create(enterprise=duplicate_peer, installed_offer_name='Fibre', bandwidth_mbps=100)
        peers = Comparison.get_sector_peers_by_sizing(self.source)
        self.assertEqual([peer['id'] for peer in peers], [duplicate_peer.pk])

    def test_no_distinct_peer_falls_back_without_designating_a_twin(self):
        self.peer.delete()
        result = Comparison.compare(self.source.pk)
        self.assertEqual(result['sector_peers'], [])
        self.assertIsNone(result['meta_b']['id'])
        self.assertTrue(result['is_benchmark_comparison'])

    def test_expansion_to_related_sectors_counts_real_companies_not_duplicate_rows(self):
        self.peer.delete()
        self.source.sector = 'Banque'; self.source.save()
        self.duplicate.sector = 'Banque'; self.duplicate.save()
        for _ in range(3):
            Enterprise.objects.create(name=self.source.name, sector='Banque')
        other = Enterprise.objects.create(name='Autre banque', sector='Banque & Services Financiers')
        peers = Comparison.get_sector_peers_by_sizing(self.source)
        self.assertEqual([peer['id'] for peer in peers], [other.pk])
