from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from sales.models import Enterprise
from kam.models import AccountCommercialAction, AccountMemoryEvent, KamAppointment, KamVisitReport


class AccountActivityTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='activity-kam', role=User.KAM)
        self.other = User.objects.create_user(username='other-kam', role=User.KAM)
        self.enterprise = Enterprise.objects.create(name='Compte activité', assigned_kam=self.kam)
        self.other_account = Enterprise.objects.create(name='Autre compte', assigned_kam=self.other)
        self.client.force_authenticate(self.kam)
        self.url = f'/api/kam/accounts/{self.enterprise.pk}/activity/'
        self.future = timezone.now() + timedelta(days=1)
        self.payload = {'action_type': 'FOLLOW_UP', 'title': 'Relancer le DSI',
                        'scheduled_at': self.future.isoformat(), 'contact_name': 'Mme Martin'}

    def create(self, **values):
        response = self.client.post(self.url, {**self.payload, **values}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def transition(self, action_id, **values):
        url = f'/api/kam/accounts/{self.enterprise.pk}/actions/{action_id}/'
        return self.client.patch(url, values, format='json')

    def test_empty_read_has_no_side_effects(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'history': [], 'planned': []})
        self.assertFalse(any(query['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for query in queries))

    def test_programmed_action_is_separate_from_completed_history(self):
        entry = self.create()
        response = self.client.get(self.url).data
        self.assertEqual(response['history'], [])
        self.assertEqual(response['planned'][0]['id'], entry['id'])
        action = AccountCommercialAction.objects.get()
        self.assertEqual(action.created_by, self.kam)
        self.assertEqual(action.enterprise, self.enterprise)
        self.assertIsNone(action.completed_at)

    def test_visit_is_added_to_agenda_once_and_uses_physical_location(self):
        entry = self.create(action_type='VISIT', location='Siège, Kinshasa')
        appointment = KamAppointment.objects.get()
        self.assertEqual(appointment.meeting_type, 'PHYSICAL')
        self.assertEqual(appointment.meet_url, '')
        self.assertEqual(appointment.location, 'Siège, Kinshasa')
        self.assertEqual(appointment.contact_name, 'Mme Martin')
        planned = self.client.get(self.url).data['planned']
        self.assertEqual(len(planned), 1)
        self.assertEqual(planned[0]['appointment_id'], appointment.pk)
        self.assertEqual(planned[0]['id'], entry['id'])

    def test_programming_rejects_past_date_missing_title_invalid_kind_and_place(self):
        for changes in ({'scheduled_at': (timezone.now() - timedelta(days=1)).isoformat()},
                        {'title': '   '}, {'action_type': 'INVALID'}, {'scheduled_at': 'bad-date'},
                        {'action_type': 'VISIT', 'location': ''}, {'result': 'Pas encore fait'}):
            response = self.client.post(self.url, {**self.payload, **changes}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(AccountCommercialAction.objects.exists())
        self.assertFalse(KamAppointment.objects.exists())

    def test_record_performed_action_requires_past_date_and_result(self):
        past = timezone.now() - timedelta(hours=2)
        self.create(status='COMPLETED', scheduled_at=past.isoformat(), result='Proposition reçue par le DSI')
        data = self.client.get(self.url).data
        self.assertEqual(len(data['history']), 1)
        self.assertEqual(data['planned'], [])
        self.assertEqual(data['history'][0]['result'], 'Proposition reçue par le DSI')
        self.assertEqual(AccountCommercialAction.objects.get().completed_at, past)
        for changes in ({'scheduled_at': self.future.isoformat(), 'result': 'Envoyé'},
                        {'scheduled_at': past.isoformat(), 'result': '  '}):
            response = self.client.post(self.url, {**self.payload, **changes, 'status': 'COMPLETED'}, format='json')
            self.assertEqual(response.status_code, 400)

    def test_complete_moves_action_to_history_and_keeps_original_schedule(self):
        entry = self.create()
        response = self.transition(entry['action_id'], status='COMPLETED', result='Rappel demandé vendredi')
        self.assertEqual(response.status_code, 200, response.data)
        action = AccountCommercialAction.objects.get()
        self.assertEqual(action.scheduled_at, self.future)
        self.assertEqual(action.completed_by, self.kam)
        self.assertIsNotNone(action.completed_at)
        data = self.client.get(self.url).data
        self.assertEqual(data['planned'], [])
        self.assertEqual(data['history'][0]['result'], 'Rappel demandé vendredi')

    def test_completed_action_is_immutable_and_same_retry_is_idempotent(self):
        entry = self.create()
        values = {'status': 'COMPLETED', 'result': 'Accord de principe'}
        self.assertEqual(self.transition(entry['action_id'], **values).status_code, 200)
        date = AccountCommercialAction.objects.get().completed_at
        self.assertEqual(self.transition(entry['action_id'], **values).status_code, 200)
        self.assertEqual(AccountCommercialAction.objects.get().completed_at, date)
        self.assertEqual(self.transition(entry['action_id'], status='CANCELLED', result='Changer').status_code, 400)
        self.assertEqual(AccountCommercialAction.objects.get().status, 'COMPLETED')

    def test_complete_or_cancel_requires_result_and_allowed_transition(self):
        entry = self.create()
        for values in ({'status': 'COMPLETED'}, {'status': 'COMPLETED', 'result': '   '},
                       {'status': 'SCHEDULED', 'result': 'Changer'}):
            self.assertEqual(self.transition(entry['action_id'], **values).status_code, 400)

    def test_cancel_keeps_audit_entry_and_cancels_linked_appointment(self):
        entry = self.create(action_type='VISIT', location='Siège')
        response = self.transition(entry['action_id'], status='CANCELLED', result='Client indisponible')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(KamAppointment.objects.get().status, 'CANCELLED')
        data = self.client.get(self.url).data
        self.assertEqual(data['planned'], [])
        self.assertEqual(data['history'][0]['status'], 'CANCELLED')
        self.assertEqual(data['history'][0]['result'], 'Client indisponible')

    def test_agenda_cancellation_is_reflected_and_cannot_be_completed(self):
        entry = self.create(action_type='VISIT', location='Siège')
        KamAppointment.objects.update(status='CANCELLED')
        data = self.client.get(self.url).data
        self.assertEqual(data['planned'], [])
        self.assertEqual(data['history'][0]['status'], 'CANCELLED')
        self.assertEqual(self.transition(entry['action_id'], status='COMPLETED', result='Visité').status_code, 400)

    def test_report_completion_automatically_replaces_scheduled_visit_without_duplicate(self):
        entry = self.create(action_type='VISIT', location='Siège')
        appointment = KamAppointment.objects.get()
        report = KamVisitReport.objects.create(enterprise=self.enterprise, kam=self.kam, appointment=appointment,
                                               executive_summary='Besoin confirmé de connectivité')
        appointment.status = 'COMPLETED'
        appointment.save()
        data = self.client.get(self.url).data
        self.assertEqual(data['planned'], [])
        self.assertEqual(len(data['history']), 1)
        self.assertEqual(data['history'][0]['report_id'], report.pk)
        self.assertEqual(data['history'][0]['description'], report.executive_summary)
        self.assertEqual(self.transition(entry['action_id'], status='COMPLETED', result='Réalisé').status_code, 400)

    def test_existing_records_include_other_kam_and_exclude_other_accounts(self):
        old = timezone.now() - timedelta(days=3)
        AccountMemoryEvent.objects.create(enterprise=self.enterprise, created_by=self.other,
                                          event_type='PROMISE', summary='Engagement commercial', occurred_at=old)
        KamVisitReport.objects.create(enterprise=self.enterprise, kam=self.other, executive_summary='Ancien KAM')
        appointment = KamAppointment.objects.create(enterprise=self.enterprise, kam=self.kam,
                                                    title='Prochaine visite', scheduled_at=self.future)
        KamVisitReport.objects.create(enterprise=self.other_account, kam=self.other, executive_summary='Privé')
        data = self.client.get(self.url).data
        self.assertEqual(len(data['history']), 2)
        self.assertEqual(data['history'][0]['description'], 'Ancien KAM')
        self.assertEqual(data['history'][0]['author'], self.other.username)
        self.assertEqual(data['history'][1]['title'], 'Engagement commercial')
        self.assertEqual(data['planned'][0]['appointment_id'], appointment.pk)

    def test_portfolio_permissions_cover_read_create_and_transition(self):
        entry = self.create()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.post(self.url, self.payload).status_code, 403)
        self.assertEqual(self.transition(entry['action_id'], status='COMPLETED', result='Test').status_code, 403)
        self.client.force_authenticate(self.kam)
        url = f'/api/kam/accounts/{self.other_account.pk}/actions/{entry["action_id"]}/'
        self.assertEqual(self.client.patch(url, {'status': 'COMPLETED', 'result': 'Test'}).status_code, 403)

    def test_action_cannot_be_modified_via_another_accessible_account(self):
        entry = self.create()
        second = Enterprise.objects.create(name='Second compte', assigned_kam=self.kam)
        url = f'/api/kam/accounts/{second.pk}/actions/{entry["action_id"]}/'
        self.assertEqual(self.client.patch(url, {'status': 'COMPLETED', 'result': 'Test'}).status_code, 404)

    def test_manager_can_see_history_but_client_and_unauthenticated_cannot(self):
        for role in ('KAM_MANAGER', 'ADMIN', 'CLIENT_B2B', 'SALESPERSON'):
            user = User.objects.create_user(username=f'activity-{role}', role=role)
            self.client.force_authenticate(user)
            expected = 200 if role in ('KAM_MANAGER', 'ADMIN') else 403
            self.assertEqual(self.client.get(self.url).status_code, expected)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_history_has_constant_query_count_and_keeps_deleted_user_events(self):
        self.create()
        with self.assertNumQueries(5):
            self.client.get(self.url)
        for index in range(10):
            self.create(title=f'Action {index}')
            AccountMemoryEvent.objects.create(enterprise=self.enterprise, created_by=self.other,
                                              event_type='DECISION', summary=f'Décision {index}', occurred_at=timezone.now())
        self.other.delete()
        with self.assertNumQueries(5):
            response = self.client.get(self.url)
        self.assertEqual(len(response.data['planned']), 11)
        self.assertEqual(response.data['history'][0]['author'], 'Utilisateur supprimé')

    def test_missing_account_returns_404(self):
        self.assertEqual(self.client.get('/api/kam/accounts/999999/activity/').status_code, 404)

    def test_running_visit_stays_in_planned_and_can_be_closed(self):
        entry = self.create(action_type='VISIT', location='Siège')
        KamAppointment.objects.update(status='IN_PROGRESS')
        data = self.client.get(self.url).data
        self.assertEqual(data['history'], [])
        self.assertEqual(data['planned'][0]['status'], 'IN_PROGRESS')
        self.assertTrue(data['planned'][0]['can_manage'])
        self.assertEqual(self.transition(entry['action_id'], status='COMPLETED', result='Visite réalisée').status_code, 200)
        self.assertEqual(KamAppointment.objects.get().status, 'COMPLETED')

    def test_reports_are_loaded_without_n_plus_one_or_raw_transcripts(self):
        for index in range(12):
            appointment = KamAppointment.objects.create(enterprise=self.enterprise, kam=self.kam,
                                                        title=f'Visite {index}', scheduled_at=timezone.now(), status='COMPLETED')
            KamVisitReport.objects.create(enterprise=self.enterprise, kam=self.kam, appointment=appointment,
                                           executive_summary=f'Synthèse {index}', raw_transcript='Verbatim privé')
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(self.url)
        self.assertEqual(len(queries), 5)
        self.assertEqual(len(response.data['history']), 12)
        self.assertEqual(response.data['planned'], [])
        self.assertFalse(any('raw_transcript' in query['sql'] for query in queries))
