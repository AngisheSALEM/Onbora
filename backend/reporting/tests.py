from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import DemoEvent
from .utils import log_demo_event

User = get_user_model()

class DemoTrackingTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin_demo',
            password='password123',
            email='admin@onbora.fr',
            first_name='Admin',
            last_name='Demo'
        )

    def test_log_demo_event_helper(self):
        initial_count = DemoEvent.objects.count()
        log_demo_event('CONVERSATION_STARTED', "Test started", self.user, {"test": True})
        self.assertEqual(DemoEvent.objects.count(), initial_count + 1)
        
        event = DemoEvent.objects.first()
        self.assertEqual(event.event_type, 'CONVERSATION_STARTED')
        self.assertEqual(event.description, "Test started")
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.metadata, {"test": True})

    def test_get_demo_stats_and_logs(self):
        log_demo_event('QUALIFICATION_SUCCESS', "Client qualified", self.user)
        log_demo_event('PDF_EXPORTED', "PDF downloaded")
        
        stats_url = reverse('demo-stats')
        response = self.client.get(stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_dossiers', response.data)
        self.assertIn('recent_logs', response.data)
        self.assertEqual(len(response.data['recent_logs']), 2)
        
        logs_url = reverse('demo-logs')
        response_logs = self.client.get(logs_url)
        self.assertEqual(response_logs.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_logs.data), 2)
