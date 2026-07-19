from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from discovery.models import ClientConversation
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from rest_framework.authtoken.models import Token

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
            raw_qualification_data={"profile": self.conversation.extracted_profile}
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
        self.assertEqual(response.data['raw_qualification_data']['provisioning']['fibre'], 'PROVISIONING')

    def test_dossier_provision_completed(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        provision_url = reverse('dossier-provision', kwargs={'pk': self.dossier.id})
        response = self.client.post(provision_url, {'service': 'fibre', 'action': 'complete'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['raw_qualification_data']['provisioning']['fibre'], 'COMPLETED')
