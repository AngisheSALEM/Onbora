from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from discovery.models import ClientConversation, ClientConversationMessage
from catalog.models import ServiceCatalog
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from django.contrib.auth import get_user_model

User = get_user_model()

class DiscoveryAPITestCase(APITestCase):
    def setUp(self):
        # Create some catalog services
        ServiceCatalog.objects.create(
            name='Fibre Optique Pro',
            category='CONNECTIVITY',
            description='Fibre pro avec GTR 4h',
            benefits='Stabilite'
        )
        ServiceCatalog.objects.create(
            name='Hébergement de Données de Santé (HDS)',
            category='CLOUD',
            description='HDS conforme',
            benefits='Securite'
        )
        
        self.create_conv_url = reverse('conversation-create')
        
    def test_conversation_lifecycle(self):
        # 1. Create conversation
        response = self.client.post(self.create_conv_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        conv_id = response.data['id']
        
        # Verify first greeting message is created
        self.assertEqual(ClientConversationMessage.objects.filter(conversation_id=conv_id).count(), 1)
        self.assertEqual(ClientConversationMessage.objects.first().sender, ClientConversationMessage.AI)
        
        # URL for sending messages
        message_url = reverse('message-create', kwargs={'pk': conv_id})
        
        # 2. Send 1st message (describe activity / sector: medical)
        response = self.client.post(message_url, {'content': 'Je suis médecin, je gère un grand cabinet médical.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['extracted_profile']['sector'], 'Médical / Santé')
        self.assertFalse(response.data['is_qualified'])
        
        # 3. Send 2nd message (size and sites count)
        response = self.client.post(message_url, {'content': 'Nous sommes 25 collaborateurs sur 2 sites.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['extracted_profile']['company_size_estimate'], '20-99 employés')
        self.assertEqual(response.data['extracted_profile']['locations_count'], 2)
        
        # 4. Send 3rd message (mention problems: internet is slow)
        response = self.client.post(message_url, {'content': 'Internet est très lent et coupe souvent.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Réseau lent / Déconnexions fréquentes', response.data['extracted_profile']['current_problems'])
        
        # 5. Send 4th message (tools: outlook and ADSL box)
        response = self.client.post(message_url, {'content': 'Nous utilisons outlook et une adsl box classique.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_qualified'])
        self.assertTrue(len(response.data['recommendations']) > 0)
        self.assertIsNotNone(response.data['business_twin'])
        
        # Verify that ProspectDossier and BusinessTwin were created in DB
        self.assertTrue(ProspectDossier.objects.filter(conversation_id=conv_id).exists())
        dossier = ProspectDossier.objects.get(conversation_id=conv_id)
        self.assertTrue(BusinessTwin.objects.filter(prospect_dossier=dossier).exists())
        
        # Verify recommended services contains Fibre (due to network problems) and HDS (due to medical sector)
        twin = BusinessTwin.objects.get(prospect_dossier=dossier)
        service_names = [s['name'] for s in twin.recommended_services]
        self.assertIn('Fibre Optique Pro', service_names)
        self.assertIn('Hébergement de Données de Santé (HDS)', service_names)
        
        # 6. Fetch recommendations via GET endpoint
        reco_url = reverse('conversation-recommendations', kwargs={'pk': conv_id})
        response = self.client.get(reco_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recommendations']), len(service_names))
        
        # 7. Transmit conversation to KAM
        transmit_url = reverse('conversation-transmit', kwargs={'pk': conv_id})
        response = self.client.post(transmit_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify conversation status is TRANSMITTED and dossier is NEW
        conv = ClientConversation.objects.get(id=conv_id)
        self.assertEqual(conv.status, ClientConversation.TRANSMITTED)
        dossier.refresh_from_db()
        self.assertEqual(dossier.status, ProspectDossier.NEW)
