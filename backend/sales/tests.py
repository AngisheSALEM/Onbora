from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock


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
        self.assertIn("Médical", response.data[0]['sector'])
        self.assertEqual(Enterprise.objects.count(), 2)

    def test_plaque_list_and_detail(self):
        # 1. Test auto-seeding and listing plaques
        list_url = reverse('plaque-list-create')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        first_plaque_id = response.data[0]['id']
        plaque_obj = Plaque.objects.get(pk=first_plaque_id)
        
        # Add a lead to this plaque
        Enterprise.objects.create(
            name="Entreprise Plaque Test",
            sector="Finance",
            plaque_rel=plaque_obj,
            is_ready_for_conversion=True
        )

        # 2. Test detail view with leads list
        detail_url = reverse('plaque-detail', kwargs={'pk': first_plaque_id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], plaque_obj.code)
        self.assertGreaterEqual(len(response.data['enterprises']), 1)

    def test_enterprise_scraping_and_ai_enrichment(self):
        ent = Enterprise.objects.create(
            name="Clinique Saint Joseph",
            sector="Santé / Médical",
            website="https://clinique-st-joseph.cd"
        )
        enrich_url = reverse('enterprise-enrich', kwargs={'pk': ent.id})
        response = self.client.post(enrich_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enterprise']['scraping_status'], 'SCRAPED')
        self.assertGreaterEqual(len(response.data['enterprise']['ai_hypotheses']), 1)
        self.assertIn("Fibre", response.data['enterprise']['ai_tailored_pitch'])

        ent.refresh_from_db()
        self.assertEqual(ent.scraping_status, 'SCRAPED')
        self.assertTrue(VisitPreparation.objects.filter(enterprise=ent).exists())

    def test_live_copilot_turn(self):
        ent = Enterprise.objects.create(
            name="Banque Commerciale",
            sector="Finance / Banque"
        )
        live_url = reverse('live-copilot-turn')
        
        # Premier tour vocal
        response = self.client.post(live_url, {
            "enterprise_id": ent.id,
            "transcript_chunk": "Nous avons des lenteurs critiques et des coupures fréquentes sur notre ligne internet."
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Fibre Optique Pro (GTR 4h)", response.data['detected_needs'])
        self.assertIn("realtime_proposition", response.data)
        self.assertGreaterEqual(len(response.data['realtime_proposition']['recommended_packages']), 1)

        # Deuxième tour vocal avec objection prix
        response = self.client.post(live_url, {
            "enterprise_id": ent.id,
            "transcript_chunk": "Mais nous faisons très attention à notre budget mensuel, c'est un peu cher."
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Sensibilité budgétaire / Coût récurrent", response.data['detected_objections'])

    def test_generate_visit_report_from_ai_and_transmit(self):
        ent = Enterprise.objects.create(name="Supermarché Express", sector="Commerce / Retail")
        prep = VisitPreparation.objects.create(
            enterprise=ent,
            salesperson=self.sales_user,
            meeting_objective="Raccordement Fibre et modernisation des caisses"
        )

        gen_url = reverse('visit-report-generate-ai')
        response = self.client.post(gen_url, {
            "preparation_id": prep.id,
            "transcript": "Discussion avec le gérant. Il confirme le besoin de fibre pro et de sécuriser son réseau informatique."
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("executive_summary", response.data)
        self.assertIn("confirmed_needs", response.data)
        self.assertIn("follow_up_email_draft", response.data)
        
        report_id = response.data['report_id']
        dossier_id = response.data['dossier_id']
        self.assertTrue(ProspectDossier.objects.filter(id=dossier_id).exists())
        self.assertTrue(BusinessTwin.objects.filter(prospect_dossier_id=dossier_id).exists())

        # Test de la boucle de feedback d'apprentissage continu
        feedback_url = reverse('visit-report-feedback', kwargs={'pk': report_id})
        fb_resp = self.client.post(feedback_url, {
            "rating": 5,
            "comments": "Excellente synthèse générée par le Core AI, propositions très pertinentes."
        }, format='json')
        self.assertEqual(fb_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(fb_resp.data['rating'], 5)

        report = VisitReport.objects.get(pk=report_id)
        self.assertEqual(report.ai_feedback_rating, 5)
        self.assertIn("Excellente", report.ai_feedback_comments)

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
        
        response = self.client.post(upload_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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

    def test_scraper_credentials_permissions(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        list_url = reverse('scraper-credential-list-create')
        
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        admin_user = User.objects.create_user(
            username='admin_test', password='password123', role=User.ADMIN
        )
        admin_token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)
        
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        
        post_data = {
            "platform": "LINKEDIN",
            "cookies_value": "li_at=testcookie123"
        }
        response = self.client.post(list_url, post_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['platform'], 'LINKEDIN')


from sales.integrations.kaabu import KaabuClient

class KaabuClientTestCase(APITestCase):
    def setUp(self):
        self.sales_user = User.objects.create_user(
            username='kaabu_sales', password='password123', role=User.SALESPERSON
        )
        self.token = Token.objects.create(user=self.sales_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

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

    def test_kaabu_deduplicate_view(self):
        url = reverse('kaabu-deduplicate')
        response = self.client.post(url, {
            "name": "Orange Business Services",
            "siren": "345678901"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("matches", response.data)
        self.assertGreaterEqual(response.data["total_matches"], 1)

    def test_arrowsphere_webhook_view(self):
        ent = Enterprise.objects.create(name="Client Cloud", arrowsphere_tenant_id="TENANT-99")
        url = reverse('arrowsphere-webhook')
        response = self.client.post(url, {
            "tenant_id": "TENANT-99",
            "status": "ACTIVE",
            "activated_services": ["MICROSOFT_365_BUSINESS_PREMIUM"]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "SUCCESS")

        ent.refresh_from_db()
        self.assertEqual(ent.sync_status, "SYNCED")
