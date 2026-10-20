from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from discovery.models import ClientConversation
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from rest_framework.authtoken.models import Token
from datetime import timedelta
from django.utils import timezone
from sales.models import Enterprise
from kam.models import KamAppointment, KamVisitReport

class KamAPITestCase(APITestCase):
    def setUp(self):
        # Create users
        self.kam_user = User.objects.create_user(
            username='kam_test', password='password123', role=User.KAM
        )
        self.client_user = User.objects.create_user(
            username='client_test', password='password123', role=User.CLIENT_B2B
        )
        self.sales_user = User.objects.create_user(
            username='sales_test', password='password123', role=User.SALESPERSON
        )
        
        # Create tokens
        self.kam_token = Token.objects.create(user=self.kam_user)
        self.client_token = Token.objects.create(user=self.client_user)
        self.sales_token = Token.objects.create(user=self.sales_user)
        
        # Create a conversation & dossier
        self.conversation = ClientConversation.objects.create(
            client=self.client_user,
            status=ClientConversation.TRANSMITTED,
            extracted_profile={
                "sector": "Médical",
                "current_problems": ["Réseau lent"]
            }
        )
        self.dossier = ProspectDossier.objects.create(
            conversation=self.conversation,
            source=ProspectDossier.INBOUND_CONVERSATION,
            status=ProspectDossier.NEW,
            kam=self.kam_user,
            raw_conversation_data={"profile": self.conversation.extracted_profile}
        )
        self.twin = BusinessTwin.objects.create(
            prospect_dossier=self.dossier,
            current_state=["Réseau lent"],
            proposed_state=["Fibre optique"],
            recommended_services=[{"name": "Fibre Pro", "priority": "HIGH"}],
            roadmap=["Étape 1: Audit"]
        )

        self.list_url = reverse('dossier-list')
        self.detail_url = reverse('dossier-detail', kwargs={'pk': self.dossier.id})
        self.twin_url = reverse('dossier-business-twin', kwargs={'pk': self.dossier.id})

    def test_list_dossiers_unauthorized(self):
        # Without token
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # As Client (Forbidden)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.client_token.key)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # As Sales (Forbidden)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.sales_token.key)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_dossiers_authorized(self):
        # As KAM (OK)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['company_name'], "Entreprise Inconnue (Inbound)")

    def test_detail_dossier_authorized(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ProspectDossier.NEW)

    def test_update_dossier_status_and_notes(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        update_data = {
            'status': ProspectDossier.IN_REVIEW,
            'internal_kam_notes': 'Contact initié par téléphone.',
            'kam': self.kam_user.id
        }
        response = self.client.patch(self.detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ProspectDossier.IN_REVIEW)
        self.assertEqual(response.data['internal_kam_notes'], 'Contact initié par téléphone.')
        self.assertEqual(response.data['kam'], self.kam_user.id)

    def test_dossier_business_twin(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        response = self.client.get(self.twin_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('roadmap', response.data)
        self.assertEqual(response.data['current_state'], ["Réseau lent"])

    def test_dossier_provision_started(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        provision_url = reverse('dossier-provision', kwargs={'pk': self.dossier.id})
        response = self.client.post(provision_url, {'service': 'fibre', 'action': 'start'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['raw_conversation_data']['provisioning']['fibre'], 'PROVISIONING')

    def test_dossier_provision_completed(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        provision_url = reverse('dossier-provision', kwargs={'pk': self.dossier.id})
        response = self.client.post(provision_url, {'service': 'fibre', 'action': 'complete'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['raw_conversation_data']['provisioning']['fibre'], 'COMPLETED')


class KamAppointmentPurposeTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='purpose_kam', password='testpass', role=User.KAM)
        self.other_kam = User.objects.create_user(username='purpose_other', password='testpass', role=User.KAM)
        self.enterprise = Enterprise.objects.create(
            name='Entreprise Test', assigned_kam=self.kam, conversion_status='PROSPECT',
            sector='Télécoms', current_operator='Vodacom',
        )
        self.client.force_authenticate(user=self.kam)
        self.suggestion_url = reverse('kam-appointment-purpose-suggestion')
        self.appointments_url = reverse('kam-appointments-list-create')

    def suggest(self):
        return self.client.get(self.suggestion_url, {'enterprise_id': self.enterprise.id})

    def test_registered_prospect_with_prior_visit_stays_discovery(self):
        self.enterprise.is_visited = True
        self.enterprise.save(update_fields=['is_visited'])
        response = self.suggest()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['suggested_purpose'], 'DISCOVERY')
        self.assertEqual(response.data['completed_kam_visits'], 0)
        self.assertTrue(response.data['prior_contact_recorded'])

    def test_confirmed_need_advances_prospect_and_counts_completed_only(self):
        previous = KamAppointment.objects.create(
            kam=self.kam, enterprise=self.enterprise, title='Découverte',
            scheduled_at=timezone.now() - timedelta(days=7), status='COMPLETED',
        )
        KamVisitReport.objects.create(
            appointment=previous, kam=self.kam, enterprise=self.enterprise,
            confirmed_needs=['Fibre dédiée'],
        )
        KamAppointment.objects.create(
            kam=self.kam, enterprise=self.enterprise, title='Annulé',
            scheduled_at=timezone.now() - timedelta(days=2), status='CANCELLED',
        )
        response = self.suggest()
        self.assertEqual(response.data['suggested_purpose'], 'QUALIFICATION')
        self.assertEqual(response.data['completed_kam_visits'], 1)

    def test_signed_account_is_follow_up_even_without_kam_history(self):
        self.enterprise.conversion_status = 'CONVERTED'
        self.enterprise.save(update_fields=['conversion_status'])
        self.assertEqual(self.suggest().data['suggested_purpose'], 'FOLLOW_UP')

    def test_recorded_growth_project_suggests_development(self):
        self.enterprise.conversion_status = 'CONVERTED'
        self.enterprise.existing_crm_data = {'growth_project': 'Ouverture de deux sites'}
        self.enterprise.save(update_fields=['conversion_status', 'existing_crm_data'])
        self.assertEqual(self.suggest().data['suggested_purpose'], 'GROWTH')

    def test_renewal_requires_orange_contract_and_real_date(self):
        self.enterprise.conversion_status = 'CONVERTED'
        self.enterprise.contract_end_date = timezone.localdate() + timedelta(days=60)
        self.enterprise.save(update_fields=['conversion_status', 'contract_end_date'])
        self.assertEqual(self.suggest().data['suggested_purpose'], 'FOLLOW_UP')
        self.enterprise.existing_crm_data = {
            'orange_contract_end_date': self.enterprise.contract_end_date.isoformat()
        }
        self.enterprise.save(update_fields=['existing_crm_data'])
        self.assertEqual(self.suggest().data['suggested_purpose'], 'GROWTH')

    def test_manual_choice_is_saved_and_reported_without_reclassification(self):
        response = self.client.post(self.appointments_url, {
            'enterprise_id': self.enterprise.id,
            'title': 'Développement du compte',
            'scheduled_at': (timezone.now() + timedelta(days=2)).isoformat(),
            'visit_purpose': 'GROWTH',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['visit_purpose'], 'GROWTH')
        self.assertEqual(response.data['purpose_source'], 'MANUAL')
        self.enterprise.conversion_status = 'CONVERTED'
        self.enterprise.save(update_fields=['conversion_status'])
        detail = self.client.get(reverse('kam-appointment-detail', kwargs={'pk': response.data['id']}))
        self.assertEqual(detail.data['visit_purpose'], 'GROWTH')

    def test_auto_classification_is_saved_and_exposed_in_history(self):
        self.enterprise.contact_name = 'Contact du compte'
        self.enterprise.contact_role = 'Direction générale'
        self.enterprise.save(update_fields=['contact_name', 'contact_role'])
        response = self.client.post(self.appointments_url, {
            'enterprise_id': self.enterprise.id,
            'title': 'Découverte des besoins',
            'scheduled_at': (timezone.now() + timedelta(days=2)).isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['visit_purpose'], 'DISCOVERY')
        self.assertEqual(response.data['purpose_source'], 'AUTO')
        self.assertEqual(response.data['contact_name'], '')
        self.assertEqual(response.data['contact_role'], '')
        appointment = KamAppointment.objects.get(pk=response.data['id'])
        appointment.status = 'COMPLETED'
        appointment.save(update_fields=['status'])
        KamVisitReport.objects.create(kam=self.kam, enterprise=self.enterprise, appointment=appointment)
        history = self.client.get(reverse('kam-visits-history'))
        self.assertEqual(history.data['visits'][0]['visit_purpose'], 'DISCOVERY')

    def test_express_meeting_starts_immediately_without_schedule_fields(self):
        before = timezone.now()
        response = self.client.post(self.appointments_url, {
            'enterprise_id': self.enterprise.id,
            'meeting_type': 'CALL',
            'start_immediately': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'IN_PROGRESS')
        self.assertEqual(response.data['meeting_type'], 'CALL')
        self.assertEqual(response.data['visit_purpose'], 'DISCOVERY')
        self.assertEqual(response.data['purpose_source'], 'AUTO')
        self.assertIn('Réunion express', response.data['title'])
        self.assertGreaterEqual(KamAppointment.objects.get(pk=response.data['id']).scheduled_at, before)

    def test_account_update_records_verified_signals(self):
        expiry = timezone.localdate() + timedelta(days=45)
        response = self.client.patch(
            reverse('kam-account-update-info', kwargs={'account_id': self.enterprise.id}),
            {'orange_contract_end_date': expiry.isoformat(), 'growth_project': 'Nouveaux sites'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['visit']['orange_contract_end_date'], expiry.isoformat())
        self.enterprise.refresh_from_db()
        self.assertEqual(self.enterprise.existing_crm_data['growth_project'], 'Nouveaux sites')
        self.enterprise.conversion_status = 'CONVERTED'
        self.enterprise.save(update_fields=['conversion_status'])
        self.assertEqual(self.suggest().data['suggested_purpose'], 'GROWTH')

    def test_preparation_uses_saved_purpose_and_known_facts(self):
        appointment = KamAppointment.objects.create(
            kam=self.kam, enterprise=self.enterprise, title='Découverte',
            visit_purpose='DISCOVERY', scheduled_at=timezone.now() + timedelta(days=2),
        )
        response = self.client.get(reverse('kam-appointment-preparation', kwargs={'pk': appointment.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['visit_purpose'], 'DISCOVERY')
        self.assertFalse(any(fact['label'].startswith('Échéance') for fact in response.data['visit_facts']))
        self.assertEqual(len(response.data['questions_to_confirm']), 3)

    def test_other_kam_cannot_inspect_suggestion_or_preparation(self):
        appointment = KamAppointment.objects.create(
            kam=self.kam, enterprise=self.enterprise, title='Découverte',
            scheduled_at=timezone.now() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.other_kam)
        self.assertEqual(self.suggest().status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(reverse('kam-appointment-preparation', kwargs={'pk': appointment.id})).status_code, status.HTTP_403_FORBIDDEN)

    def test_vocal_meeting_bant_qualification_with_decision_maker_and_timeline(self):
        from unittest.mock import patch
        from shared.infrastructure.ai_providers import MockAIQualificationAdapter
        from kam.views import _qualify_vocal_meeting, serialize_kam_visit_report

        appointment = KamAppointment.objects.create(
            kam=self.kam,
            enterprise=self.enterprise,
            title='RDV Stratégique DG',
            contact_name='M. Kabasele',
            contact_role='Directeur Général',
            scheduled_at=timezone.now()
        )
        transcript = (
            "Bonjour, je suis le Directeur Général de l'entreprise. "
            "Nous subissons des coupures fréquentes et avons un besoin critique d'une Fibre très haut débit sécurisée "
            "avec un secours automatique. Nous avons le budget validé et voulons signer sous 15 jours pour démarrer."
        )
        with patch('sales.services.qualification_service.get_ai_qualification_provider', return_value=MockAIQualificationAdapter()):
            exec_sum, needs, objections, actions, email, bant = _qualify_vocal_meeting(appointment, transcript, self.kam)

        self.assertTrue(bant['decision_maker_contacted'])
        self.assertIn("Directeur Général", bant['decision_maker_role'])
        self.assertTrue(any("Fibre" in n or "Connectivité" in n or "continuité" in n for n in bant['discovered_needs']))
        self.assertEqual(bant['signature_timeline'], "Sous 15 jours")
        self.assertTrue(bant['has_explicit_timeline'])
        self.assertTrue(bant['budget_discussed'])
        self.assertGreater(bant['total'], 50)

        # Vérifier la sérialisation
        report = KamVisitReport.objects.create(
            appointment=appointment,
            kam=self.kam,
            enterprise=self.enterprise,
            raw_transcript=transcript,
            executive_summary=exec_sum,
            confirmed_needs=needs,
            bant_scores=bant
        )
        serialized = serialize_kam_visit_report(report)
        self.assertIn('bant_scores', serialized)
        self.assertIn('bant_analysis', serialized)
        self.assertTrue(serialized['bant_scores']['decision_maker_contacted'])
        self.assertEqual(serialized['bant_scores']['signature_timeline'], "Sous 15 jours")
        self.assertTrue(len(serialized['bant_scores']['discovered_needs']) > 0)

    def test_vocal_meeting_bant_qualification_without_decision_maker_or_timeline(self):
        from unittest.mock import patch
        from shared.infrastructure.ai_providers import MockAIQualificationAdapter
        from kam.views import _qualify_vocal_meeting

        appointment = KamAppointment.objects.create(
            kam=self.kam,
            enterprise=self.enterprise,
            title='Prise de contact',
            contact_name='Jean',
            contact_role='Stagiaire',
            scheduled_at=timezone.now()
        )
        transcript = (
            "Bonjour, je suis stagiaire au service informatique. Nous regardons les options de fibre et cloud "
            "mais je ne peux rien décider moi-même. Aucun budget ni calendrier de signature n'est fixé pour le moment."
        )
        with patch('sales.services.qualification_service.get_ai_qualification_provider', return_value=MockAIQualificationAdapter()):
            exec_sum, needs, objections, actions, email, bant = _qualify_vocal_meeting(appointment, transcript, self.kam)

        self.assertFalse(bant['decision_maker_contacted'])
        self.assertEqual(bant['signature_timeline'], "Non précisé")
        self.assertFalse(bant['has_explicit_timeline'])

    def test_technical_specs_detail_and_pdf_views(self):
        self.client.force_authenticate(user=self.kam)

        # 1. Test GET Technical Specs JSON
        response = self.client.get(f'/api/kam/pre-call/{self.enterprise.id}/technical-specs/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('reference', data)
        self.assertIn('deployment_overview', data)
        self.assertIn('solutions', data)
        self.assertIn('equipment_list', data)
        self.assertIn('network_configuration', data)
        self.assertIn('acceptance_checklist', data)
        self.assertTrue(len(data['equipment_list']) > 0)
        self.assertTrue(len(data['acceptance_checklist']) > 0)

        # 2. Test POST Technical Specs Regeneration
        custom_solutions = [
            {
                "name": "Fibre Dédiée Pro 500 Mbps",
                "category": "CONNECTIVITY",
                "speed": "500 Mbps symétrique",
                "sla": "SLA 99.99% · GTR 2h"
            }
        ]
        post_response = self.client.post(
            f'/api/kam/pre-call/{self.enterprise.id}/technical-specs/',
            data={"solutions": custom_solutions},
            format='json'
        )
        self.assertEqual(post_response.status_code, 200)
        post_data = post_response.json()
        self.assertEqual(post_data['enterprise']['id'], self.enterprise.id)

        # 3. Test GET Technical Specs PDF Download
        pdf_response = self.client.get(f'/api/kam/pre-call/{self.enterprise.id}/technical-specs/pdf/')
        self.assertEqual(pdf_response.status_code, 200)
        self.assertEqual(pdf_response['Content-Type'], 'application/pdf')
        self.assertTrue(pdf_response.content.startswith(b'%PDF-'))

    def test_enterprise_comparison_feature(self):
        self.client.force_authenticate(user=self.kam)

        # Créer une seconde entreprise dans le même secteur pour le comparatif
        peer_enterprise = Enterprise.objects.create(
            name="Banque B - Peer Test",
            sector="Banque & Services Financiers",
            segment="GRAND_COMPTE",
            annual_revenue=1500000.00,
            employee_count=120,
            site_count=5,
            current_connectivity="Fibre Dédiée 200M",
            incident_count=0,
            assigned_kam=self.kam
        )

        # 1. Test Sectors Overview endpoint
        sectors_res = self.client.get('/api/kam/comparisons/sectors/')
        self.assertEqual(sectors_res.status_code, 200)
        sectors_data = sectors_res.json()
        self.assertIn('sectors', sectors_data)
        self.assertTrue(len(sectors_data['sectors']) > 0)
        banking_sector = next((s for s in sectors_data['sectors'] if 'Banque' in s['sector']), None)
        self.assertIsNotNone(banking_sector)
        self.assertIn('enterprises', banking_sector)

        # 2. Test Compare Two Enterprises
        comp_res = self.client.get(f'/api/kam/comparisons/?enterprise_a={self.enterprise.id}&enterprise_b={peer_enterprise.id}')
        self.assertEqual(comp_res.status_code, 200)
        comp_data = comp_res.json()
        self.assertIn('headline', comp_data)
        self.assertIn('radar', comp_data)
        self.assertEqual(len(comp_data['radar']), 6)
        self.assertIn('advantages_a', comp_data)
        self.assertIn('gaps_a', comp_data)
        self.assertIn('criteria_breakdown', comp_data)
        self.assertIn('kam_recommendations', comp_data)
        self.assertFalse(comp_data['is_benchmark_comparison'])

        # 3. Test Compare Enterprise with Sector Benchmark (single enterprise)
        bench_res = self.client.get(f'/api/kam/comparisons/?enterprise_a={self.enterprise.id}')
        self.assertEqual(bench_res.status_code, 200)
        bench_data = bench_res.json()
        self.assertTrue(bench_data['is_benchmark_comparison'])
        self.assertIn('Moyenne du secteur', bench_data['meta_b']['name'])

        # 4. Test Missing enterprise_a query param
        err_res = self.client.get('/api/kam/comparisons/')
        self.assertEqual(err_res.status_code, 400)



    def test_core_ai_scoring_rules_integration(self):
        from apps.kam.services.enterprise_comparison_service import EnterpriseComparisonService
        policy = EnterpriseComparisonService.get_sector_policy("Banque & Services Financiers")
        self.assertIn("ideal_basket", policy)
        self.assertIn("sizing_rules", policy)
        self.assertIn("radar_weights", policy)
        
        scores = EnterpriseComparisonService._compute_enterprise_scores(self.enterprise)
        self.assertIn("overall_score", scores)
        self.assertIn("dimensions", scores)
        self.assertIn("gaps", scores)
        self.assertIn("bandwidth_ratio", scores)
        self.assertLessEqual(scores["overall_score"], 100)
        self.assertGreaterEqual(scores["overall_score"], 10)
