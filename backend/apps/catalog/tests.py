from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from catalog.models import ServiceCatalog
from rest_framework.authtoken.models import Token

class CatalogAPITestCase(APITestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_user(
            username='admin_test', password='password123', role=User.ADMIN
        )
        self.kam_user = User.objects.create_user(
            username='kam_test', password='password123', role=User.KAM
        )
        
        # Create tokens
        self.admin_token = Token.objects.create(user=self.admin_user)
        self.kam_token = Token.objects.create(user=self.kam_user)
        
        # Create a catalog service
        self.service = ServiceCatalog.objects.create(
            name='Test Service',
            category=ServiceCatalog.CONNECTIVITY,
            description='A test service description.',
            benefits='Benefits of test service.',
            technical_requirements={'bandwidth': '100 Mbps'}
        )

        self.list_url = reverse('service-list-create')
        self.detail_url = reverse('service-detail', kwargs={'pk': self.service.id})

    def test_list_services_public(self):
        # Public access (no token) should be allowed to view
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Service')

    def test_create_service_unauthorized(self):
        # Non-admin user (KAM) should be forbidden
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        data = {
            'name': 'New Service',
            'category': ServiceCatalog.SECURITY,
            'description': 'A new security service.',
            'benefits': 'Safety.',
            'technical_requirements': {}
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_service_admin(self):
        # Admin user should succeed
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.admin_token.key)
        data = {
            'name': 'New Service',
            'category': ServiceCatalog.SECURITY,
            'description': 'A new security service.',
            'benefits': 'Safety.',
            'technical_requirements': {}
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceCatalog.objects.count(), 2)

    def test_update_service_admin(self):
        # Admin user should succeed
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.admin_token.key)
        data = {
            'name': 'Updated Test Service',
            'description': 'Updated description.'
        }
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.name, 'Updated Test Service')
        self.assertEqual(self.service.description, 'Updated description.')

    def test_delete_service_unauthorized(self):
        # Non-admin user should fail
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_service_admin(self):
        # Admin user should succeed
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.admin_token.key)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ServiceCatalog.objects.count(), 0)

    def test_upload_file_unauthorized(self):
        # Non-admin user should get 403
        import io
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.kam_token.key)
        fp = io.BytesIO(b"Service: Security Pro")
        fp.name = 'security.pdf'
        response = self.client.post(reverse('service-upload'), {'file': fp}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_file_admin(self):
        # Admin user should succeed and get structured services
        import io
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.admin_token.key)
        
        # Test simulated security document parsing
        fp = io.BytesIO(b"Dossier de cybersecurite")
        fp.name = 'security_catalog.pdf'
        response = self.client.post(reverse('service-upload'), {'file': fp}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filename'], 'security_catalog.pdf')
        self.assertEqual(response.data['file_type'], 'pdf')
        self.assertTrue(len(response.data['services']) > 0)
        self.assertEqual(response.data['services'][0]['category'], 'SECURITY')
