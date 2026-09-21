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
