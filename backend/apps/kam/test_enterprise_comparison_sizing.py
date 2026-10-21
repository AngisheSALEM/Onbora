from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.services.enterprise_comparison_service import EnterpriseComparisonService

User = get_user_model()


class EnterpriseComparisonSizingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="kam_tester",
            email="kam_tester@orange.cd",
            password="password123",
            role="KAM"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Entreprise A (PME au départ : 500 postes, 100 Mbps Fibre Pro)
        self.ent_a = Enterprise.objects.create(
            name="Alpha Corp",
            sector="Technologies & IT",
            employee_count=500,
            site_count=2,
            current_connectivity="Fibre Pro 100 Mbps",
            annual_revenue=1000000.0,
            assigned_kam=self.user
        )

        # Pair PME (proche de 500 postes : 480 postes)
        self.ent_pme_peer = Enterprise.objects.create(
            name="Beta Tech PME",
            sector="Technologies & IT",
            employee_count=480,
            site_count=2,
            current_connectivity="Fibre Dédiée 100 Mbps",
            annual_revenue=950000.0
        )

        # Pair Grand Compte (proche de 2500 postes : 2600 postes)
        self.ent_gc_peer = Enterprise.objects.create(
            name="Mega Telecom GC",
            sector="Technologies & IT",
            employee_count=2600,
            site_count=6,
            current_connectivity="Fibre Dédiée Entreprise 1 Gbps (LSI)",
            annual_revenue=15000000.0
        )

    def test_bandwidth_extraction(self):
        """Vérifie l'extraction déterministe de la bande passante."""
        ent = Enterprise(current_connectivity="Fibre Dédiée Entreprise 1 Gbps (LSI)")
        bw = EnterpriseComparisonService._extract_bandwidth_mbps(ent, [])
        self.assertEqual(bw, 1000)

        ent_moyen = Enterprise(current_connectivity="Moyen débit (30 Mbps)")
        bw_moyen = EnterpriseComparisonService._extract_bandwidth_mbps(ent_moyen, [])
        self.assertEqual(bw_moyen, 30)

    def test_default_closest_sizing_peer(self):
        """Par défaut, le comparateur doit choisir le pair au dimensionnement le plus proche."""
        res = EnterpriseComparisonService.compare(self.ent_a.id)
        self.assertFalse(res["is_benchmark_comparison"])
        # Pour 500 postes, Beta Tech PME (480 postes) doit être le pair sélectionné
        self.assertEqual(res["meta_b"]["id"], self.ent_pme_peer.id)
        self.assertGreaterEqual(res["sizing_comparison"]["similarity_percentage"], 85)

    def test_dynamic_sizing_evolution_score_drop(self):
        """
        Simulation d'évolution : quand les machines passent de 500 à 2500 avec un faible débit,
        le score de connectivité chute, un gap critique apparaît, et le jumeau change.
        """
        # État 1 : 500 postes avec 100 Mbps -> ratio 0.20 Mbps/poste (satisfaisant)
        score_1 = EnterpriseComparisonService._compute_enterprise_scores(self.ent_a)

        # État 2 : Mise à jour à 2500 postes avec Moyen débit 30 Mbps
        self.ent_a.employee_count = 2500
        self.ent_a.current_connectivity = "Moyen débit (30 Mbps)"
        self.ent_a.site_count = 6
        self.ent_a.save()

        score_2 = EnterpriseComparisonService._compute_enterprise_scores(self.ent_a)

        # Le score de connectivité doit chuter sévèrement
        self.assertLess(score_2["dimensions"]["connectivity"], score_1["dimensions"]["connectivity"])
        
        # Un gap critique de dimensionnement doit être présent
        sizing_gaps = [g for g in score_2["gaps"] if g.get("category") == "Dimensionnement"]
        self.assertTrue(len(sizing_gaps) > 0)
        self.assertEqual(sizing_gaps[0]["severity"], "CRITICAL")
        self.assertIn("2500 machines", sizing_gaps[0]["issue"])

        # Le comparateur doit désormais choisir Mega Telecom GC (2600 postes) comme nouveau jumeau
        res_evolved = EnterpriseComparisonService.compare(self.ent_a.id)
        self.assertEqual(res_evolved["meta_b"]["id"], self.ent_gc_peer.id)
        self.assertGreaterEqual(res_evolved["sizing_comparison"]["similarity_percentage"], 80)

    def test_api_comparison_endpoint(self):
        """Vérifie les retours de l'endpoint DRF /api/kam/comparisons/."""
        # 1. Requête automatique (choix du jumeau)
        resp = self.client.get(f"/api/kam/comparisons/?enterprise_a={self.ent_a.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("sizing_comparison", data)
        self.assertIn("gaps_a", data)
        self.assertIn("radar", data)
        self.assertEqual(data["meta_b"]["id"], self.ent_pme_peer.id)

        # 2. Requête explicite avec benchmark
        resp_bench = self.client.get(f"/api/kam/comparisons/?enterprise_a={self.ent_a.id}&enterprise_b=benchmark")
        self.assertEqual(resp_bench.status_code, status.HTTP_200_OK)
        data_bench = resp_bench.json()
        self.assertTrue(data_bench["is_benchmark_comparison"])
