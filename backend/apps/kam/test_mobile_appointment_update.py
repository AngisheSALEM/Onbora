from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Enterprise
from kam.models import KamAppointment


class MobileAppointmentUpdateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='mobile-kam', role=User.KAM)
        self.enterprise = Enterprise.objects.create(name='Compte mobile', assigned_kam=self.user)
        self.appointment = KamAppointment.objects.create(
            kam=self.user, enterprise=self.enterprise, title='Découverte',
            scheduled_at=timezone.now() + timedelta(days=1), visit_purpose='DISCOVERY',
        )
        self.client.force_authenticate(self.user)
        self.url = f'/api/kam/appointments/{self.appointment.id}/'

    def test_mobile_edits_persist_all_displayed_fields(self):
        date = timezone.now() + timedelta(days=4)
        response = self.client.patch(self.url, {
            'title': 'Suivi des sites', 'scheduled_at': date.isoformat(),
            'meeting_type': 'CALL', 'duration_minutes': 60, 'location': 'Gombe',
            'contact_name': 'Alice', 'contact_role': 'DSI', 'objective': 'Valider le budget',
            'visit_purpose': 'FOLLOW_UP',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.title, 'Suivi des sites')
        self.assertEqual(self.appointment.scheduled_at, date)
        self.assertEqual(self.appointment.meeting_type, 'CALL')
        self.assertEqual(self.appointment.duration_minutes, 60)
        self.assertEqual(self.appointment.contact_name, 'Alice')
        self.assertEqual(self.appointment.contact_role, 'DSI')
        self.assertEqual(self.appointment.location, 'Gombe')
        self.assertEqual(self.appointment.purpose_source, 'MANUAL')

    def test_invalid_update_is_atomic(self):
        response = self.client.patch(self.url, {'title':'Doit rester inchangé', 'duration_minutes':0}, format='json')
        self.assertEqual(response.status_code, 400)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.title, 'Découverte')

    def test_other_kam_cannot_edit_this_appointment(self):
        other = User.objects.create_user(username='other-mobile-kam', role=User.KAM)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.patch(self.url, {'title':'Interdit'}, format='json').status_code, 403)

    def test_real_transcript_and_notes_are_passed_to_ai_and_saved(self):
        url = f'/api/kam/appointments/{self.appointment.id}/complete-vocal/'
        with patch('kam.views._qualify_vocal_meeting', return_value=('Synthèse', ['Fibre'], [], ['Proposition'], 'Email', {})) as qualify:
            response = self.client.post(url, {'transcript':'Transcription du client', 'notes':'Budget à confirmer'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        transcript = response.data['report']['raw_transcript']
        self.assertIn('Transcription du client', transcript)
        self.assertIn('Budget à confirmer', transcript)
        self.assertEqual(qualify.call_args.args[1], transcript)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'COMPLETED')
        self.assertEqual(self.appointment.report.raw_transcript, transcript)
