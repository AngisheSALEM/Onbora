from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Enterprise
from kam.models import KamAppointment


class PhysicalAppointmentTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='physical-kam', role=User.KAM)
        self.enterprise = Enterprise.objects.create(name='Compte terrain', assigned_kam=self.kam)
        self.client.force_authenticate(self.kam)
        self.payload = {
            'enterprise_id': self.enterprise.pk, 'title': 'Visite sur site',
            'scheduled_at': (timezone.now() + timedelta(days=1)).isoformat(),
            'visit_purpose': 'DISCOVERY', 'location': 'Siège du client',
        }

    def test_default_is_physical_and_remote_link_is_not_saved(self):
        response = self.client.post('/api/kam/appointments/', {
            **self.payload, 'meet_url': 'https://meet.google.com/old-link',
        })
        self.assertEqual(response.status_code, 201, response.data)
        appointment = KamAppointment.objects.get()
        self.assertEqual(appointment.meeting_type, 'PHYSICAL')
        self.assertEqual(appointment.location, 'Siège du client')
        self.assertEqual(appointment.meet_url, '')

    def test_creation_rejects_other_formats(self):
        for meeting_type in ('CALL', 'GOOGLE_MEET'):
            response = self.client.post('/api/kam/appointments/', {**self.payload, 'meeting_type': meeting_type})
            self.assertEqual(response.status_code, 400)
        self.assertFalse(KamAppointment.objects.exists())

    def test_update_cannot_change_a_physical_appointment_to_remote(self):
        appointment = KamAppointment.objects.create(
            enterprise=self.enterprise, kam=self.kam, title='Visite', scheduled_at=timezone.now(),
        )
        response = self.client.patch(f'/api/kam/appointments/{appointment.pk}/', {'meeting_type': 'CALL'})
        self.assertEqual(response.status_code, 400)
        appointment.refresh_from_db()
        self.assertEqual(appointment.meeting_type, 'PHYSICAL')

    def test_old_report_keeps_its_original_format_when_updating_another_field(self):
        appointment = KamAppointment.objects.create(
            enterprise=self.enterprise, kam=self.kam, title='Historique', scheduled_at=timezone.now(), meeting_type='GOOGLE_MEET',
        )
        response = self.client.patch(f'/api/kam/appointments/{appointment.pk}/', {'title': 'Historique conservé'})
        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertEqual(appointment.meeting_type, 'GOOGLE_MEET')
