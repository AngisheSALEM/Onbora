from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from rest_framework.authtoken.models import Token

class UserModelTest(APITestCase):
    def test_create_user_default_role(self):
        user = User.objects.create_user(username='testclient', password='password123')
        self.assertEqual(user.role, User.CLIENT_B2B)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_with_role(self):
        user = User.objects.create_user(
            username='testkam', 
            password='password123', 
            role=User.KAM,
            phone='0611223344',
            company_name='TestCompany'
        )
        self.assertEqual(user.role, User.KAM)
        self.assertEqual(user.phone, '0611223344')
        self.assertEqual(user.company_name, 'TestCompany')

    def test_create_superuser(self):
        admin = User.objects.create_superuser(username='adminuser', password='password123', email='admin@test.com')
        self.assertEqual(admin.role, User.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)


class AuthAPITest(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.me_url = reverse('me')
        
        self.user_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123',
            'role': User.SALESPERSON,
            'phone': '0699999999'
        }
        
        # Pre-create a user for login test
        self.existing_user = User.objects.create_user(
            username='existinguser',
            password='existingpass123',
            role=User.KAM
        )

    def test_register_user_success(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')
        self.assertEqual(response.data['user']['role'], User.SALESPERSON)
        
        # Verify db entry
        user = User.objects.get(username='newuser')
        self.assertEqual(user.role, User.SALESPERSON)
        self.assertEqual(user.phone, '0699999999')

    def test_register_missing_fields(self):
        incomplete_data = {'username': 'incomplete'}
        response = self.client.post(self.register_url, incomplete_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        login_data = {
            'username': 'existinguser',
            'password': 'existingpass123'
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], User.KAM)

    def test_login_failure(self):
        login_data = {
            'username': 'existinguser',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_me_unauthorized(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me_authorized(self):
        token, created = Token.objects.get_or_create(user=self.existing_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'existinguser')
        self.assertEqual(response.data['role'], User.KAM)
