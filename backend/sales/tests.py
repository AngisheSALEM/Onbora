from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Enterprise, VisitPreparation, VisitReport
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from rest_framework.authtoken.models import Token

class SalesAPITestCase(APITestCase):
    def setUp(self):
        self.sales_user = User.objects.create_user(
            username='sales_test', password='password123', role=User.SALESPERSON
        )
        self.token = Token.objects.create(user=self.sales_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.search_url = reverse('enterprise-search')
        self.prep_url = reverse('visit-preparation-create')
        self.report_url = reverse('visit-report-create')

    def test_search_and_mock_enterprise(self):
        self.assertEqual(Enterprise.objects.count(), 0)
        
        response = self.client.get(f"{self.search_url}?q=Google")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Google")
        self.assertEqual(response.data[0]['sector'], "Services aux entreprises")
        self.assertEqual(Enterprise.objects.count(), 1)
        
        response = self.client.get(f"{self.search_url}?q=Cabinet Medical Sante")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['sector'], "Médical / Santé")
        self.assertEqual(Enterprise.objects.count(), 2)

    def test_create_visit_preparation(self):
        ent = Enterprise.objects.create(name="Orange", sector="Telecom")
        
        response = self.client.post(self.prep_url, {'enterprise': ent.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('hypothesis_to_verify', response.data)
        self.assertEqual(response.data['enterprise'], ent.id)
        
        self.assertEqual(VisitPreparation.objects.count(), 1)
        self.assertEqual(VisitPreparation.objects.first().salesperson, self.sales_user)

    def test_create_visit_report_and_transmit(self):
        ent = Enterprise.objects.create(name="Free", sector="Telecom")
        prep = VisitPreparation.objects.create(enterprise=ent, salesperson=self.sales_user)
        
        response = self.client.post(self.report_url, {
            'preparation': prep.id,
            'raw_transcript': "Le client veut sécuriser ses accès cloud HDS et changer son téléphone standard."
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('confirmed_needs', response.data)
        
        self.assertIn('Hébergement de Données de Santé (HDS)', response.data['confirmed_needs'])
        self.assertIn('Téléphonie Teams (VoIP)', response.data['confirmed_needs'])
        report_id = response.data['id']
        
        transmit_url = reverse('visit-report-transmit', kwargs={'pk': report_id})
        response = self.client.post(transmit_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertTrue(ProspectDossier.objects.filter(visit_report_id=report_id).exists())
        dossier = ProspectDossier.objects.get(visit_report_id=report_id)
        self.assertEqual(dossier.source, ProspectDossier.OUTBOUND_VISIT)
        self.assertEqual(dossier.status, ProspectDossier.NEW)
        self.assertTrue(BusinessTwin.objects.filter(prospect_dossier=dossier).exists())
