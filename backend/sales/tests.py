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
        # 1. Create and list plaques
        plaque_obj = Plaque.objects.create(
            code="PLQ-GOMBE-01",
            name="Zone Gombe Centre",
            city="Kinshasa",
            latitude=-4.3033,
            longitude=15.3084,
            radius_km=3.5,
            is_active=True
        )

        list_url = reverse('plaque-list-create')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        first_plaque_id = plaque_obj.id
        
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

    def test_supervisor_salesperson_lifecycle(self):
        # 1. Create a supervisor user
        supervisor = User.objects.create_user(
            username='sup_test', password='sup_password', role=User.SUPERVISOR
        )
        sup_token = Token.objects.create(user=supervisor)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + sup_token.key)

        # 2. Supervisor creates a new salesperson account
        create_url = reverse('salesperson-list')
        response = self.client.post(create_url, {
            "username": "dieudonne_mukendi",
            "password": "mobile_pass_2026",
            "first_name": "Dieudonné",
            "last_name": "Mukendi",
            "phone": "+243 81 000 1234",
            "location": "Kinshasa"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sales_id = response.data["id"]
        self.assertEqual(response.data["username"], "dieudonne_mukendi")

        # 3. Verify that the commercial can authenticate via /api/auth/login/
        self.client.credentials()  # clear auth
        login_url = reverse('login')
        login_resp = self.client.post(login_url, {
            "username": "dieudonne_mukendi",
            "password": "mobile_pass_2026"
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("token", login_resp.data)
        self.assertEqual(login_resp.data["user"]["role"], User.SALESPERSON)

        # 4. Supervisor revokes/deletes the salesperson account
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + sup_token.key)
        delete_url = reverse('salesperson-detail', kwargs={'pk': sales_id})
        del_resp = self.client.delete(delete_url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)

        # 5. Verify that subsequent login attempt fails immediately
        self.client.credentials()  # clear auth
        failed_login = self.client.post(login_url, {
            "username": "dieudonne_mukendi",
            "password": "mobile_pass_2026"
        }, format='json')
        self.assertEqual(failed_login.status_code, status.HTTP_400_BAD_REQUEST)

    def test_field_intelligence_flow_and_leaderboard(self):
        # 1. Prepare enterprise
        enterprise = Enterprise.objects.create(
            name="Supermarché Kin-Express",
            sector="Grande Distribution",
            latitude=-4.321,
            longitude=15.312
        )

        # 2. Submit Field Intelligence Report with Lookalike 100m, Referrals and Trade Audit
        fi_url = reverse('field-intelligence-list-create')
        payload = {
            "enterprise_id": enterprise.id,
            "conversion_status": "SUCCESS",
            "rccm_number": "CD/KIN/RCCM/26-B-00123",
            "nurturing_reason": "NONE",
            "nearby_leads": [
                {
                    "name": "Boulangerie Le Pain d'Or",
                    "sector": "Alimentation",
                    "manager_name": "Alain Dupont",
                    "phone": "+243 89 111 2233",
                    "proximity_notes": "Juste en face à 30 mètres",
                    "latitude": -4.3212,
                    "longitude": 15.3125
                },
                {
                    "name": "Pharmacie du Centre Gombe",
                    "sector": "Santé / Pharmacie",
                    "manager_name": "Dr. Sarah",
                    "phone": "+243 81 444 5566",
                    "proximity_notes": "2 portes à gauche",
                    "latitude": -4.3208,
                    "longitude": 15.3119
                }
            ],
            "referrals": [
                {
                    "referral_type": "SUPPLIER",
                    "company_name": "Minoterie Centrale RDC",
                    "contact_person": "M. Kabasele (Directeur Achats)",
                    "phone": "+243 99 888 7766",
                    "notes": "Fournisseur principal de farine, gros besoin d'interconnexion"
                }
            ],
            "trade_audits": [
                {
                    "competitor_name": "FAI Historique X",
                    "satisfaction_score": 1,
                    "friction_reasons": ["Coupures récurrentes", "Support client injoignable"],
                    "monthly_spend_estimated": 450.00,
                    "alert_notes": "Le client veut résilier dès qu'une alternative fibre est dispo."
                }
            ]
        }

        response = self.client.post(fi_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Expected points: 5 (conversion) + 2x1 (2 nearby) + 1 (1 referral) + 1 (1 audit) = 9 pts
        self.assertEqual(response.data["points_earned"], 9)
        self.assertEqual(len(response.data["report"]["nearby_leads"]), 2)
        self.assertEqual(len(response.data["report"]["referrals"]), 1)
        self.assertEqual(len(response.data["report"]["trade_audits"]), 1)

        # 3. Verify Trade Audit auto-flagged priority friction (score 1 <= 2)
        audit_url = reverse('field-intelligence-trade-audits')
        audit_resp = self.client.get(f"{audit_url}?priority=true")
        self.assertEqual(audit_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(audit_resp.data), 1)
        self.assertEqual(audit_resp.data[0]["competitor_name"], "FAI Historique X")
        self.assertTrue(audit_resp.data[0]["is_priority_friction_alert"])

        # 4. Verify Leaderboard ranking
        leaderboard_url = reverse('field-intelligence-leaderboard')
        leader_resp = self.client.get(leaderboard_url)
        self.assertEqual(leader_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(leader_resp.data), 1)
        top_user = leader_resp.data[0]
        self.assertEqual(top_user["salesperson_name"], self.sales_user.username)
        self.assertEqual(top_user["total_points"], 9)
        self.assertEqual(top_user["rank"], 1)
        self.assertEqual(top_user["nearby_leads_count"], 2)

    def test_adv_provisioning_queue_and_stp_trigger(self):
        """Test ADV Straight-Through Processing (STP) Queue and 1-Click Trigger"""
        from kam.models import ProspectDossier

        # 1. Create a validated dossier ready for ADV
        dossier = ProspectDossier.objects.create(
            contact_name="M. Directeur Informatique",
            phone="+243 81 999 0000",
            rccm="CD/KNG/RCCM/2026-B-1122",
            status="ACCEPTED",
            source="OUTBOUND_VISIT",
            raw_conversation_data={
                "company_name": "Rawbank RDC Siege",
                "email": "dsi@rawbank.cd"
            }
        )

        # 2. Check ADV Queue
        queue_url = reverse('adv-provisioning-queue')
        queue_resp = self.client.get(queue_url)
        self.assertEqual(queue_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(queue_resp.data), 1)
        item = next(d for d in queue_resp.data if d["id"] == dossier.id)
        self.assertEqual(item["company_name"], "Rawbank RDC Siege")
        self.assertEqual(item["provisioning_status"], "READY_FOR_PROVISIONING")

        # 3. Trigger 1-Click STP Provisioning
        stp_url = reverse('adv-provisioning-trigger-stp')
        payload = {
            "dossier_id": dossier.id,
            "company_name": "Rawbank RDC Siege",
            "admin_email": "dsi@rawbank.cd",
            "location": "Kinshasa (Boulevard du 30 Juin)"
        }
        stp_resp = self.client.post(stp_url, payload, format='json')
        self.assertEqual(stp_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(stp_resp.data["orchestration_status"], "ALL_SERVICES_ACTIVE")
        self.assertEqual(stp_resp.data["zte_zsmart"]["status"], "SUCCESS")
        self.assertEqual(stp_resp.data["microsoft_csp"]["status"], "SUCCESS")
        self.assertEqual(stp_resp.data["tom_fibre"]["status"], "SUCCESS")
        self.assertTrue(stp_resp.data["sms_notification_sent"])

        # 4. Verify Dossier status updated to COMPLETED / ACTIVE
        dossier.refresh_from_db()
        self.assertEqual(dossier.status, "COMPLETED")
        self.assertEqual(dossier.raw_conversation_data['provisioning']['fibre'], 'COMPLETED')
        self.assertEqual(dossier.raw_conversation_data['provisioning']['m365'], 'COMPLETED')


