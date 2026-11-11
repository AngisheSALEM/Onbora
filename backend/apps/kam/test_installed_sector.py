from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.services.enterprise_comparison_service import EnterpriseComparisonService as Comparison


class InstalledSectorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='installed-kam', role=User.KAM)
        self.client.force_authenticate(self.user)
        self.enterprise = Enterprise.objects.create(name='Mine test', sector='Mines & Énergie', current_connectivity='')
        self.url = f'/api/kam/accounts/{self.enterprise.pk}/installed-offers/'

    def test_options_are_exactly_the_comparison_pillars(self):
        options = self.client.get(self.url + '?options=sector').data
        pillars = Comparison.get_sector_policy(self.enterprise.sector)['pillars']
        self.assertEqual([p['name'] for p in options], [p['label'] for p in pillars])

    def test_saved_pillar_is_used_even_with_custom_product_name(self):
        pillar = Comparison.get_sector_policy(self.enterprise.sector)['pillars'][0]
        response = self.client.post(self.url, {
            'installed_offer_name': 'Contrat numéro 123', 'sector_pillar_id': pillar['id'],
            'bandwidth_mbps': 100, 'category': 'ignored', 'provider': 'CONCURRENT',
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['category'], pillar['category'])
        score = Comparison._compute_enterprise_scores(self.enterprise)
        self.assertFalse(any(g['issue'] == f"Absence de {pillar['label']}" for g in score['gaps']))
        self.assertEqual(self.client.get(self.url).data[0]['sector_pillar_id'], pillar['id'])
        self.assertEqual(self.client.delete(self.url + str(response.data['id']) + '/').status_code, 204)

    def test_invalid_pillar_status_provider_and_negative_values_are_rejected(self):
        for extra in ({'sector_pillar_id': 'nonexistent'}, {'bandwidth_mbps': -1},
                      {'provider': 'BAD'}, {'contract_status': 'BAD'}, {'monthly_cost_mrr': -5}):
            response = self.client.post(self.url, {'installed_offer_name': 'Test', **extra})
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(EnterpriseInstalledOffer.objects.count(), 0)

    def test_non_kam_cannot_change_park(self):
        self.user.role = User.CLIENT_B2B
        self.user.save()
        self.assertEqual(self.client.post(self.url, {'installed_offer_name': 'Test'}).status_code, 403)

    def test_comparison_uses_recorded_sim_count_and_product_name(self):
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.enterprise, installed_offer_name='Flotte réelle', sector_pillar_id='cloud',
            active_licenses_count=42, contract_status='ACTIVE',
        )
        metrics = Comparison._compute_pillar_metric_units(
            'cloud', 'Flotte Mobile & IoT', self.enterprise, {}, None, {},
        )
        self.assertEqual(metrics['unit_val_a'], '42 SIM')
        self.assertEqual(metrics['pack_name_a'], 'Flotte réelle')
        self.assertIsNone(metrics['raw_val_b'])
        self.assertFalse(metrics['is_deficit_a'])

    def test_inactive_products_do_not_count_in_comparison(self):
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.enterprise, installed_offer_name='Ancien contrat', sector_pillar_id='cloud',
            active_licenses_count=900, contract_status='TERMINATED',
        )
        self.assertIsNone(Comparison._recorded_pillar_metrics('cloud', 'IoT', self.enterprise, None))

    def test_fibre_product_does_not_invent_mobile_cloud_or_sla_products(self):
        self.enterprise.employee_count = 3500
        self.enterprise.annual_revenue = 9000000
        self.enterprise.save()
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.enterprise, installed_offer_name='Fibre réelle',
            sector_pillar_id='connectivity', bandwidth_mbps=100,
        )
        for pillar, label in [('cloud', 'Flotte Mobile & IoT'), ('sla', 'Continuité & SLA'),
                              ('cloud', 'Cloud & sauvegarde')]:
            with self.subTest(pillar=label):
                metrics = Comparison._compute_pillar_metric_units(
                    pillar, label, self.enterprise, {'has_backup_link': True}, None, {},
                )
                self.assertIsNone(metrics['raw_val_a'])
                self.assertEqual(metrics['unit_val_a'], 'Non renseigné')
                self.assertEqual(metrics['pack_name_a'], '')
