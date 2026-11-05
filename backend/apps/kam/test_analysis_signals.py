import copy
import io
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_core.models import CompanyResearchJob
from apps.ai_core.test_company_research import observation
from apps.ai_core.company_analysis.jobs import enqueue_research
from apps.ai_core.company_analysis.worker import process_next_research
from kam.models import (AnalysisSignal, AnalysisSignalObservation, AnalysisSignalReview,
                        AnalysisSignalReviewEvent, AnalysisSignalRun)
from kam.services.analysis_signal_ingestion import retain_analysis_signals
from kam.services.analysis_signals_service import signal_dashboard
from sales.models import Enterprise


class AnalysisSignalsTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='signal-kam', role='KAM')
        self.other = get_user_model().objects.create_user(username='signal-other', role='KAM')
        self.enterprise = Enterprise.objects.create(name='Entreprise Démonstration Onbora',
            sector='Industrie', city='Kinshasa', website='https://example.com', assigned_kam=self.user)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.url = '/api/kam/analysis-signals/'
        self.params = {'start': '2026-10-01', 'end': '2026-10-31'}

    def retain(self, data=None, enterprise=None):
        data = copy.deepcopy(data or observation())
        job = CompanyResearchJob.objects.create(owner=self.user, enterprise=enterprise or self.enterprise,
            request_data={'subject': data['result']['subject']}, state='completed',
            applied_at=timezone.now(), response_data=data, idempotency_key=str(CompanyResearchJob.objects.count()))
        retain_analysis_signals(job, data)
        return job

    def dashboard(self, **filters):
        response = self.api.get(self.url, {**self.params, **filters})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_repeated_runs_do_not_multiply_signals_or_erase_sources(self):
        first = self.retain()
        retain_analysis_signals(first, first.response_data)
        second = observation()
        second['result']['sources'][0]['url'] = 'https://example.com/new-source'
        second['result']['facts'][0]['id'] = 'fact_new_id'
        second['result']['profile']['activities']['fact_ids'] = ['fact_new_id']
        second['result']['summary']['sentences'][0]['fact_ids'] = ['fact_new_id']
        self.retain(second)
        self.assertEqual(AnalysisSignal.objects.count(), 2)
        self.assertEqual(AnalysisSignalObservation.objects.count(), 4)
        self.assertEqual(AnalysisSignalRun.objects.count(), 2)
        activity = AnalysisSignal.objects.get(category='ACTIVITY')
        urls = {row.payload['sources'][0]['url'] for row in activity.observations.all()}
        self.assertEqual(urls, {'https://example.com/entreprise-fictive', 'https://example.com/new-source'})
        self.assertEqual(self.dashboard()['stats']['new_signals'], 2)

    def test_changed_fact_is_new_and_existing_fact_keeps_first_detection(self):
        self.retain()
        data = observation()
        data['completed_at'] = '2026-10-30T10:00:00Z'
        data['result']['facts'][0].update(value='Nouvelle activité', normalized_value='Nouvelle activité',
                                        observed_at='2026-10-30T10:00:00Z')
        self.retain(data)
        self.assertEqual(AnalysisSignal.objects.count(), 3)
        self.assertEqual(AnalysisSignal.objects.filter(category='LOCATION').get().first_seen.day, 29)

    def test_only_supported_facts_are_counted_and_empty_runs_contribute_to_coverage(self):
        data = observation()
        data['result']['identity']['status'] = 'ambiguous'
        self.retain(data)
        self.assertEqual(AnalysisSignal.objects.count(), 0)
        stats = self.dashboard()['stats']
        self.assertEqual(stats['analyzed_companies'], 1)
        self.assertEqual(stats['new_signals'], 0)

    def test_sources_and_uncertain_identity_are_visible_without_invented_priority(self):
        self.retain()
        result = self.dashboard()
        signal = result['list']['results'][0]
        self.assertEqual(signal['confidence'], 'IDENTITY_UNCERTAIN')
        self.assertEqual(signal['priority'], 'UNKNOWN')
        self.assertIsNone(signal['event_date'])
        detail = self.api.get(f"{self.url}{signal['id']}/").data
        self.assertEqual(detail['history']['count'], 1)
        self.assertTrue(detail['history']['results'][0]['sources'][0]['url'])

    def test_filters_drilldown_and_complete_daily_series(self):
        self.retain()
        data = self.dashboard(focus_category='LOCATION')
        self.assertEqual(data['stats']['new_signals'], 2)
        self.assertEqual(data['list']['count'], 1)
        self.assertEqual(len(data['timeline']), 31)
        self.assertEqual(sum(row['count'] for row in data['timeline']), 2)
        self.assertEqual(self.dashboard(sector='Autre')['stats']['new_signals'], 0)
        self.assertEqual(self.dashboard(q='aucun résultat')['list']['count'], 0)

    def test_private_followup_is_audited_and_survives_research(self):
        self.retain()
        signal = AnalysisSignal.objects.first()
        url = f'{self.url}{signal.pk}/'
        self.assertEqual(self.api.patch(url, {'state': 'ACTIONED'}, format='json').status_code, 400)
        body = {'state': 'ACTIONED', 'priority': 'HIGH', 'note': 'Appel effectué ; rendez-vous proposé.'}
        self.assertEqual(self.api.patch(url, body, format='json').status_code, 200)
        self.api.patch(url, body, format='json')
        self.assertEqual(AnalysisSignalReviewEvent.objects.count(), 1)
        self.retain()
        detail = self.api.get(url).data
        self.assertEqual(detail['state'], 'ACTIONED')
        self.assertEqual(detail['history']['count'], 2)
        self.assertEqual(self.dashboard()['stats']['actioned'], 1)
        self.api.patch(url, {'state': 'CLOSED'}, format='json')
        self.assertEqual(self.dashboard()['stats']['actioned'], 1)

    def test_permissions_apply_to_charts_details_and_mutations(self):
        self.retain()
        signal = AnalysisSignal.objects.first()
        self.api.force_authenticate(self.other)
        self.assertEqual(self.dashboard()['stats']['new_signals'], 0)
        url = f'{self.url}{signal.pk}/'
        self.assertEqual(self.api.get(url).status_code, 404)
        self.assertEqual(self.api.patch(url, {'priority': 'HIGH'}, format='json').status_code, 404)
        self.assertFalse(AnalysisSignalReview.objects.exists())
        self.api.force_authenticate(get_user_model().objects.create_user(username='signal-sales', role='SALESPERSON'))
        self.assertEqual(self.api.get(self.url).status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(self.url).status_code, [401, 403])

    def test_other_authorized_user_does_not_inherit_personal_review(self):
        self.retain()
        signal = AnalysisSignal.objects.first()
        self.api.patch(f'{self.url}{signal.pk}/', {'priority': 'HIGH'}, format='json')
        self.enterprise.assigned_kam = self.other
        self.enterprise.save(update_fields=['assigned_kam'])
        self.api.force_authenticate(self.other)
        self.assertEqual(self.dashboard()['list']['results'][0]['priority'], 'UNKNOWN')

    def test_backfill_is_offline_and_idempotent(self):
        job = self.retain()
        AnalysisSignalRun.objects.all().delete()
        with patch('requests.request') as network:
            call_command('backfill_analysis_signals', stdout=io.StringIO())
            call_command('backfill_analysis_signals', stdout=io.StringIO())
            network.assert_not_called()
        self.assertEqual(AnalysisSignal.objects.count(), 2)
        self.assertEqual(AnalysisSignalObservation.objects.count(), 2)
        job.refresh_from_db()
        self.assertEqual(job.state, 'completed')

    def test_invalid_dates_and_filters_are_rejected(self):
        for params in [{'start': 'invalid'}, {'start': '2026-11-01', 'end': '2026-10-01'},
                       {'page': 0}, {'confidence': 'invented'}, {'start': '2020-01-01'}]:
            self.assertEqual(self.api.get(self.url, params).status_code, 400)

    def test_query_count_is_independent_of_number_of_signals(self):
        from django.test.utils import CaptureQueriesContext
        from django.db import connection
        self.retain()
        with CaptureQueriesContext(connection) as small:
            signal_dashboard(self.user, {'start': timezone.now().date() - timedelta(days=40)})
        data = observation()
        for index in range(4):
            data['result']['facts'][0]['normalized_value'] = f'Activité {index}'
            self.retain(data)
        with CaptureQueriesContext(connection) as large:
            signal_dashboard(self.user, {'start': timezone.now().date() - timedelta(days=40)})
        self.assertEqual(len(small), len(large))
        self.assertLess(len(large), 25)

    def test_worker_archives_completed_research_automatically(self):
        enqueue_research(self.user, self.enterprise, key='archive-worker')
        client = MagicMock()
        client.create.return_value = (observation(), 1)
        self.assertTrue(process_next_research(client))
        self.assertEqual(AnalysisSignal.objects.count(), 2)
        self.assertEqual(AnalysisSignalRun.objects.count(), 1)

    def test_past_period_uses_proof_available_at_that_time(self):
        data = observation()
        data['result']['identity']['status'] = 'confirmed'
        self.retain(data)
        data['completed_at'] = '2026-11-02T08:00:00Z'
        for fact in data['result']['facts']:
            fact['support_status'] = 'corroborated'
        self.retain(data)
        self.assertEqual(self.dashboard()['list']['results'][0]['confidence'], 'SUPPORTED')
        current = self.dashboard(start='2026-10-01', end='2026-11-03')
        self.assertEqual(current['list']['results'][0]['confidence'], 'CORROBORATED')
        self.assertEqual(current['stats']['new_signals'], 2)

    def test_duplicate_facts_in_one_run_are_consolidated(self):
        data = observation()
        duplicate = copy.deepcopy(data['result']['facts'][0])
        duplicate['id'] = 'fact_duplicate'
        data['result']['facts'].append(duplicate)
        self.retain(data)
        self.assertEqual(AnalysisSignal.objects.count(), 2)
        self.assertEqual(AnalysisSignalObservation.objects.count(), 2)

    def test_day_buckets_use_kinshasa_time_not_event_date(self):
        data = observation()
        data['completed_at'] = '2026-10-29T23:30:00Z'
        data['result']['facts'][0]['valid_at'] = '2026-10-01'
        self.retain(data)
        dashboard = self.dashboard()
        counts = {row['day']: row['count'] for row in dashboard['timeline']}
        self.assertEqual(counts['2026-10-30'], 2)
        self.assertEqual(counts['2026-10-01'], 0)
        self.assertEqual(self.dashboard(focus_day='2026-10-30')['list']['count'], 2)
