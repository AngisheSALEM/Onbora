from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from kam.models import KamVisitReport
from kam.services.sector_analytics_service import get_sector_analytics
from sales.models import Enterprise, EnterpriseInstalledOffer


class SectorAnalyticsTests(TestCase):
    def setUp(self):
        users = get_user_model().objects
        self.kam = users.create_user(username='sector_kam', role='KAM')
        self.other = users.create_user(username='sector_other', role='KAM')
        self.enterprise = Enterprise.objects.create(
            name='Banque témoin', sector=' Banque ', assigned_kam=self.kam,
        )

    def test_scoped_portfolio_and_no_synthetic_infrastructure(self):
        Enterprise.objects.create(name='Confidentiel', assigned_kam=self.other)
        Enterprise.objects.create(name='Sans affectation')
        result = get_sector_analytics(self.kam)['accounts']
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['sector'], 'Banque')
        self.assertEqual(result[0]['offers'], [])
        self.assertEqual(result[0]['needs'], [])

    def test_recorded_active_offers_and_confirmed_needs_only(self):
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.enterprise, installed_offer_name='Cloud', category='CLOUD',
            contract_end_date=date(2027, 1, 1),
        )
        EnterpriseInstalledOffer.objects.create(
            enterprise=self.enterprise, installed_offer_name='Résilié', contract_status='TERMINATED',
        )
        for needs in [[' Sauvegarde ', 'sauvegarde', None, {'title': 'Invalide'}], ['Sauvegarde']]:
            KamVisitReport.objects.create(enterprise=self.enterprise, kam=self.kam, confirmed_needs=needs)
        KamVisitReport.objects.create(
            enterprise=self.enterprise, kam=self.other, confirmed_needs=['Rapport privé'],
        )
        result = get_sector_analytics(self.kam)['accounts'][0]
        self.assertEqual(result['needs'], ['sauvegarde'])
        self.assertEqual(result['offers'], [{'category': 'CLOUD', 'end_date': '2027-01-01'}])

    def test_query_count_does_not_grow_with_portfolio(self):
        for index in range(5):
            Enterprise.objects.create(name=f'Compte {index}', assigned_kam=self.kam)
        with self.assertNumQueries(3):
            self.assertEqual(len(get_sector_analytics(self.kam)['accounts']), 6)

    def test_endpoint_permissions_and_admin_scope(self):
        client = APIClient()
        url = '/api/kam/sector-analytics/'
        self.assertIn(client.get(url).status_code, [401, 403])
        client.force_authenticate(get_user_model().objects.create_user(username='sector_sales', role='SALESPERSON'))
        self.assertEqual(client.get(url).status_code, 403)
        client.force_authenticate(self.kam)
        self.assertEqual(client.get(url).json()['accounts'][0]['id'], str(self.enterprise.pk))
        Enterprise.objects.create(name='Autre portefeuille', assigned_kam=self.other, sector=None)
        client.force_authenticate(get_user_model().objects.create_user(username='sector_admin', role='ADMIN'))
        result = client.get(url)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(result.json()['accounts']), 2)
        self.assertIn('Secteur non renseigné', [row['sector'] for row in result.json()['accounts']])

    def test_empty_portfolio(self):
        self.assertEqual(get_sector_analytics(self.other)['accounts'], [])
