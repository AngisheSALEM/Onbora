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

    def test_voice_upload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload_url = reverse('voice-upload')
        
        # Test without file
        response = self.client.post(upload_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test with file
        audio_file = SimpleUploadedFile("test_recording.webm", b"mocked_audio_content", content_type="audio/webm")
        ent = Enterprise.objects.create(name="Clinique Test", sector="Médical / Santé")
        prep = VisitPreparation.objects.create(enterprise=ent, salesperson=self.sales_user)
        
        response = self.client.post(upload_url, {
            'audio': audio_file,
            'preparation_id': prep.id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('audio_file_path', response.data)
        self.assertIn('transcript', response.data)
        self.assertIn('HDS', response.data['transcript'])

    def test_scraper_credentials_permissions(self):
        # 1. Non-admin salesperson should get 403
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        list_url = reverse('scraper-credential-list-create')
        
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 2. Admin should get 200
        admin_user = User.objects.create_user(
            username='admin_test', password='password123', role=User.ADMIN
        )
        admin_token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)
        
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        
        # 3. Admin can create credentials
        post_data = {
            "platform": "LINKEDIN",
            "cookies_value": "li_at=testcookie123"
        }
        response = self.client.post(list_url, post_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['platform'], 'LINKEDIN')
        self.assertEqual(response.data['cookies_value'], 'li_at=testcookie123')


from unittest.mock import patch, MagicMock
from sales.integrations.kaabu import KaabuClient

class KaabuClientTestCase(APITestCase):
    @patch('sales.integrations.kaabu.requests.post')
    def test_get_access_token_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "mocked-jwt-token-123",
            "expires_in": 3600
        }
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        client = KaabuClient()
        from django.core.cache import cache
        cache.delete(client.cache_key)

        token = client.get_access_token()
        self.assertEqual(token, "mocked-jwt-token-123")
        mock_post.assert_called_once()

    @patch('sales.integrations.kaabu.requests.get')
    @patch('sales.integrations.kaabu.requests.post')
    def test_search_organizations_success(self, mock_post, mock_get):
        mock_token_resp = MagicMock()
        mock_token_resp.json.return_value = {"access_token": "token", "expires_in": 60}
        mock_token_resp.status_code = 200
        mock_post.return_value = mock_token_resp

        mock_search_resp = MagicMock()
        mock_search_resp.json.return_value = [
            {
                "id": "org-obs-123",
                "name": "Orange Business",
                "siren": "123456789",
                "website": "https://www.orange-business.com"
            }
        ]
        mock_search_resp.status_code = 200
        mock_get.return_value = mock_search_resp

        client = KaabuClient()
        results = client.search_organizations(name="Orange")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "org-obs-123")
        self.assertEqual(results[0]["siren"], "123456789")


