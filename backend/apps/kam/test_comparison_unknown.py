from unittest.mock import patch

from django.test import TestCase
from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.services.enterprise_comparison_service import EnterpriseComparisonService as Comparison


class UnknownInfrastructureComparisonTests(TestCase):
    def setUp(self):
        self.unknown = Enterprise.objects.create(name="Nouveau compte", sector="Services", current_connectivity="")
        self.known = Enterprise.objects.create(name="Compte renseigné", sector="Services", current_connectivity="Fibre 100 Mbps")
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.known, installed_offer_name="Fibre souscrite", sector_pillar_id="connectivity",
            category="CONNECTIVITY", bandwidth_mbps=100,
        )

    def compare(self, a, b):
        with patch.object(Comparison, "get_sector_peers_by_sizing", return_value=[]):
            return Comparison.compare(a.pk, b.pk)

    def assert_unknown(self, result, side):
        self.assertIsNone(result[f"overall_score_{side}"])
        self.assertFalse(result[f"meta_{side}"]["has_infrastructure_data"])
        self.assertEqual(result["winner"], "TIE")
        self.assertEqual(result["kam_recommendations"], [])
        self.assertEqual(result["gaps_a"], [])
        self.assertEqual(result["gaps_b"], [])
        self.assertTrue(result["radar"])
        for row in result["radar"]:
            self.assertIsNone(row[f"score_{side}"])
            self.assertIsNone(row[f"raw_val_{side}"])
            self.assertEqual(row[f"unit_val_{side}"], "Non renseigné")
            self.assertEqual(row[f"pack_name_{side}"], "")
            self.assertFalse(row["is_deficit_a"])
            self.assertFalse(row["is_winner_a"])

    def test_unknown_on_either_side_preserves_known_peer(self):
        for a, b, side, peer in ((self.unknown, self.known, "a", "b"), (self.known, self.unknown, "b", "a")):
            with self.subTest(side=side):
                result = self.compare(a, b)
                self.assert_unknown(result, side)
                self.assertIsInstance(result[f"overall_score_{peer}"], (int, float))

    def test_legacy_conversion_placeholder_is_not_evidence(self):
        self.unknown.current_connectivity = "4G LTE / Opérateur Tiers"
        self.unknown.save()
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.unknown, installed_offer_name="Liaison Internet 4G LTE Opérateur Tiers",
            category="CONNECTIVITY", provider="CONCURRENT", contract_status="ACTIVE",
            bandwidth_mbps=20, monthly_cost_mrr=150,
        )
        self.assert_unknown(self.compare(self.unknown, self.known), "a")

    def test_real_installed_offer_enables_evaluation(self):
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.unknown, installed_offer_name="Fibre dédiée réelle",
            category="CONNECTIVITY", contract_status="ACTIVE", bandwidth_mbps=100,
        )
        result = self.compare(self.unknown, self.known)
        self.assertTrue(result["meta_a"]["has_infrastructure_data"])
        self.assertIsInstance(result["overall_score_a"], (int, float))

    def test_model_default_without_offers_is_unknown(self):
        self.unknown.current_connectivity = "4G LTE"
        self.unknown.save()
        self.assert_unknown(self.compare(self.unknown, self.known), "a")

    def test_declared_fibre_and_employee_count_do_not_create_installed_products(self):
        self.unknown.current_connectivity = 'Fibre FTTH'
        self.unknown.sector = 'Mines & Énergie'
        self.unknown.employee_count = 3500
        self.unknown.site_count = 2
        self.unknown.save()
        self.assertEqual(self.unknown.installed_offers.count(), 0)
        self.assert_unknown(self.compare(self.unknown, self.known), 'a')

    def test_both_empty_parks_are_unknown_despite_connectivity_labels(self):
        self.known.installed_offers.all().delete()
        self.unknown.current_connectivity = 'Fibre FTTH'
        self.unknown.save()
        result = self.compare(self.unknown, self.known)
        self.assert_unknown(result, 'a')
        self.assert_unknown(result, 'b')
