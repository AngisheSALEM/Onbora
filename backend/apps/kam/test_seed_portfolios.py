from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import User
from kam.models import ChurnRadarAssessment, ChurnRadarSnapshot, KamVisitReport
from kam.services.churn_radar_service import ChurnRadarService
from sales.models import Enterprise


class KamPortfolioSeedTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='kam_demo', role=User.KAM, kam_specialization='PME')
        self.other_kam = User.objects.create_user(username='kam_other', role=User.KAM)
        self.real_account = Enterprise.objects.create(name='Compte existant', assigned_kam=self.kam, incident_count=0)
        call_command('seed_kam_portfolios', kam=self.kam.username, stdout=StringIO())
        self.demo_accounts = Enterprise.objects.filter(crm_id__startswith=f'DEMO-KAM-{self.kam.pk}-')

    def test_seed_is_idempotent_and_preserves_existing_accounts(self):
        counts = (Enterprise.objects.count(), KamVisitReport.objects.count(), ChurnRadarSnapshot.objects.count())
        call_command('seed_kam_portfolios', kam=self.kam.username, stdout=StringIO())
        self.assertEqual(counts, (Enterprise.objects.count(), KamVisitReport.objects.count(), ChurnRadarSnapshot.objects.count()))
        self.real_account.refresh_from_db()
        self.assertEqual(self.real_account.name, 'Compte existant')
        self.assertEqual(self.real_account.incident_count, 0)
        self.assertEqual(self.demo_accounts.count(), 16)
        self.assertFalse(Enterprise.objects.filter(assigned_kam=self.other_kam).exists())

    def test_seed_populates_all_dashboard_cohorts_and_conditional_tabs(self):
        summary = ChurnRadarService.get_portfolio_summary(self.kam)['summary_cards']
        for key in ('high_risk', 'renewals', 'upsell', 'no_action'):
            self.assertGreater(summary[key]['count'], 0, key)
        self.assertGreater(summary['high_risk']['healthy_count'], 0)
        combinations = set()
        for assessment in ChurnRadarAssessment.objects.filter(enterprise__in=self.demo_accounts):
            combinations.add((assessment.risk_level != 'LOW', bool(assessment.upsell_opportunities)))
        self.assertEqual(combinations, {(False, False), (True, False), (False, True), (True, True)})

    def test_account_pages_include_all_accounts_without_cross_kam_leaks(self):
        self.client.force_authenticate(self.kam)
        first = self.client.get('/api/kam/accounts/?page=1&page_size=12')
        second = self.client.get('/api/kam/accounts/?page=2&page_size=12')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['count'], 17)
        self.assertEqual(len(first.data['accounts']), 12)
        self.assertEqual(len(second.data['accounts']), 5)
        self.assertFalse({v['id'] for v in first.data['accounts']} & {v['id'] for v in second.data['accounts']})
        self.client.force_authenticate(self.other_kam)
        self.assertEqual(self.client.get('/api/kam/accounts/').data['accounts'], [])
        enterprise = self.demo_accounts.first()
        self.assertEqual(self.client.get(f'/api/kam/accounts/{enterprise.pk}/radar/').status_code, 404)

    def test_cached_demo_briefing_and_radar_are_available_without_external_ai(self):
        self.client.force_authenticate(self.kam)
        enterprise = self.demo_accounts.first()
        briefing = self.client.get(f'/api/kam/pre-call/{enterprise.pk}/')
        self.assertEqual(briefing.status_code, 200)
        self.assertEqual(briefing.data['ai_summary']['status'], 'DEMO')
        self.assertEqual(briefing.data['enterprise_id'], enterprise.pk)
        radar = self.client.get(f'/api/kam/accounts/{enterprise.pk}/radar/')
        self.assertEqual(radar.status_code, 200)
        self.assertEqual(radar.data['enterprise_id'], enterprise.pk)


class ChurnReportScoringTests(TestCase):
    def test_critical_pain_uses_the_stored_french_choice(self):
        enterprise = Enterprise.objects.create(name='Client insatisfait', pain_level='Critique')
        score = ChurnRadarService.calculate_deterministic_health_score(enterprise)
        self.assertIn('Insatisfaction client ou signaux de friction opérationnelle détectés', score['risk_reasons'])

    def test_visit_report_summary_is_read_for_customer_dissatisfaction(self):
        kam = User.objects.create_user(username='report_kam', role=User.KAM)
        enterprise = Enterprise.objects.create(name='Client avec rapport', assigned_kam=kam, pain_level='Faible')
        KamVisitReport.objects.create(kam=kam, enterprise=enterprise, executive_summary='Le client signale des coupures et son insatisfaction.')
        score = ChurnRadarService.calculate_deterministic_health_score(enterprise)
        self.assertIn('Insatisfaction client ou signaux de friction opérationnelle détectés', score['risk_reasons'])
