"""End-to-end source context, bounded inference and shared vector updates."""
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings

from accounts.models import User, DynamicsImportedRecord
from sales.models import Enterprise, EnterpriseInstalledOffer, SeedImportRecord
from kam.models import PreCallBriefing
from kam.services.enterprise_comparison_service import EnterpriseComparisonService
from .common.base_engine import BaseAIEngine
from .company_analysis.account_context import build_account_context, enrich_brief
from .company_analysis.adapter import build_company_brief
from .company_analysis.briefing import read_briefing
from .models import AIVectorDocument
from .test_hardening import VectorFixtureMixin
from .unified_engine import UnifiedCoreAIEngine
from .vector_search.documents import persist_enterprise_document


class AccountContextTests(VectorFixtureMixin, TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='context-owner', role='KAM')
        self.enterprise = Enterprise.objects.create(name='AMT CONGO', sector='Logistique',
            assigned_kam=self.owner, employee_count=None, site_count=None, annual_revenue=None,
            current_connectivity='', city='')
        self.record = SeedImportRecord.objects.create(external_id='context-import', enterprise=self.enterprise,
            payload={'kind': 'company', 'name': 'AMT CONGO', 'activity': 'Transport de marchandises',
                     'sources': [{'label': 'FEC', 'reference': 'annuaire.pdf#page=138'}]})

    def test_imported_context_reaches_brief_without_fabricating_public_evidence(self):
        data = read_briefing(self.enterprise, self.owner)
        facts = [item['text'] for item in data['ai_summary']['key_facts']]
        self.assertIn('Activité du registre : Transport de marchandises', facts)
        self.assertIn('AMT CONGO', data['ai_summary']['overview']['text'])
        self.assertTrue(any('Effectif' in text for text in data['ai_summary']['gaps']))
        self.assertEqual(data['evidence'], [])
        self.assertEqual(data['recommended_solutions'], [])
        self.assertEqual(data['predicted_needs'], [])
        self.assertEqual(data['ai_inference']['status'], 'not_requested')

    def test_crm_services_and_activities_are_available_to_core(self):
        EnterpriseInstalledOffer.objects.create(enterprise=self.enterprise,
            installed_offer_name='Fibre 100 Mbps', bandwidth_mbps=100, contract_status='ACTIVE')
        DynamicsImportedRecord.objects.create(enterprise=self.enterprise, source_key='source',
            entity='opportunities', remote_id=uuid.uuid4(), kind='opportunities',
            data={'name': 'Extension du réseau', 'description': 'Raccorder trois agences',
                  'start_date': '2026-12-01', 'amount': 1200, 'currency_code': 'USD'})
        context = build_account_context(self.enterprise)
        self.assertIn('Fibre 100 Mbps', context['text'])
        self.assertIn('Raccorder trois agences', context['text'])
        self.assertIn('2026-12-01', context['text'])
        self.assertIn('1200', context['text'])

    def test_activity_produces_conditional_options_without_claiming_a_need(self):
        data = read_briefing(self.enterprise, self.owner)
        preparation = data['commercial_preparation']
        self.assertEqual(len(preparation['questions']), 3)
        self.assertTrue(preparation['solution_options'])
        self.assertTrue(preparation['solution_options'][0]['requires_confirmation'])
        self.assertEqual(data['recommended_solutions'], [])
        self.assertEqual(data['predicted_needs'], [])
        self.record.payload['activity'] = ''
        self.record.save()
        self.assertEqual(read_briefing(self.enterprise, self.owner)['commercial_preparation']['solution_options'], [])

    def test_context_change_invalidates_cached_brief_but_preserves_human_edits(self):
        engine = UnifiedCoreAIEngine()
        data = engine.generate_pre_call_briefing(self.enterprise, self.owner)
        saved = PreCallBriefing.objects.create(enterprise=self.enterprise, kam=self.owner,
            analysis_data=data, company_overview=data['company_overview'])
        self.enterprise.employee_count = 120
        self.enterprise.save(update_fields=['employee_count'])
        current = read_briefing(self.enterprise, self.owner)
        self.assertNotEqual(current['context_fingerprint'], data['context_fingerprint'])
        saved.analysis_data['ai_summary']['status'] = 'kam_edited'
        saved.company_overview = {'summary': 'Correction humaine'}
        saved.save()
        self.assertEqual(read_briefing(self.enterprise, self.owner)['company_overview']['summary'], 'Correction humaine')

    def test_gemini_only_selects_known_facts(self):
        context = build_account_context(self.enterprise)
        engine = SimpleNamespace(model_name='test-model', call_gemini_json=MagicMock(return_value={
            'priority_fact_ids': ['registry:activity'], 'suggested_offers': []}))
        data = enrich_brief(build_company_brief(self.enterprise.name), context, engine)
        self.assertEqual(data['ai_inference']['status'], 'generated')
        self.assertEqual(data['ai_summary']['key_facts'][0]['text'], 'Activité du registre : Transport de marchandises')
        engine.call_gemini_json.return_value = {'priority_fact_ids': ['invented-fact']}
        data = enrich_brief(build_company_brief(self.enterprise.name), context, engine)
        self.assertEqual(data['ai_inference']['status'], 'fallback')
        self.assertNotIn('invented-fact', str(data['ai_summary']))

    def test_vectors_include_live_source_data_and_refresh_across_instances(self):
        first, second = self.make_vector_service(), self.make_vector_service()
        first.search('transport')
        document = persist_enterprise_document(self.enterprise)
        self.assertIn('Transport de marchandises', document['content_to_vectorize'])
        self.assertNotIn('4G LTE', document['content_to_vectorize'])
        self.assertNotIn('1 collaborateurs', document['content_to_vectorize'])
        doc_id = f'enterprise_profile_{self.enterprise.pk}'
        for service in (first, second):
            self.assertIn(doc_id, {row.doc_id for row in service.search('AMT CONGO transport', n_results=10)})
        self.assertEqual(first._embed_text('santé ÉNERGIE'), first._embed_text('sante energie'))
        first._ensure_indexed()
        self.assertEqual(first._resolve_doc_and_vector(f'account-{self.enterprise.pk}')[0], doc_id)
        self.record.payload['activity'] = 'Transit douanier spécialisé'
        self.record.save()
        persist_enterprise_document(self.enterprise)
        second.search('transit')
        actual = next(d for d in second._documents if d['id'] == doc_id)
        self.assertIn('Transit douanier spécialisé', actual['content_to_vectorize'])

    def test_unknown_effectifs_do_not_break_comparison_or_invent_infrastructure(self):
        Enterprise.objects.create(name='Pair', sector='Logistique', employee_count=None,
            site_count=None, annual_revenue=None, current_connectivity='')
        result = EnterpriseComparisonService.compare(self.enterprise.pk)
        self.assertIsNone(result['overall_score_a'])
        self.assertEqual(result['criteria_breakdown'][-1]['val_a'], 'Non renseigné')
        self.assertFalse(result['meta_b']['is_twin'])
        self.assertFalse(result['meta_b']['is_closest_twin'])

    def test_sector_size_and_old_cached_predictions_do_not_establish_needs(self):
        self.enterprise.sector = 'Commerce et services'
        self.enterprise.employee_count = 150
        self.enterprise.site_count = 4
        self.enterprise.ai_hypotheses = [{'hypothesis': 'Fibre 100 Mbps', 'evidence': 'Secteur commerce'}]
        self.enterprise.save()
        data = UnifiedCoreAIEngine().generate_pre_call_briefing(self.enterprise, self.owner)
        data['predicted_needs'] = [{'need': 'Ancienne suggestion non sourcée'}]
        PreCallBriefing.objects.create(enterprise=self.enterprise, kam=self.owner,
            analysis_data=data, company_overview=data['company_overview'])
        self.assertEqual(read_briefing(self.enterprise, self.owner)['predicted_needs'], [])

    def test_hypothesis_requires_valid_supported_fact_ids(self):
        from .test_company_research import observation
        self.enterprise.scraped_data = observation()['result']
        self.enterprise.ai_hypotheses = [{'hypothesis': 'Vérifier la capacité du réseau',
            'status': 'HYPOTHESIS', 'fact_ids': ['invented']}]
        engine = UnifiedCoreAIEngine()
        self.assertEqual(engine._extract_real_and_predicted_needs(self.enterprise)[1], [])
        fact = self.enterprise.scraped_data['facts'][0]
        self.enterprise.ai_hypotheses[0]['fact_ids'] = [fact['id']]
        hypotheses = engine._extract_real_and_predicted_needs(self.enterprise)[1]
        self.assertEqual(hypotheses[0]['reason'], fact['statement'])
        self.assertEqual(hypotheses[0]['evidence_ids'], fact['evidence_ids'])

    @override_settings(GEMINI_API_KEY='')
    def test_configured_gemini_model_is_respected_and_empty_response_is_explicit(self):
        engine = BaseAIEngine(model_name='gemini-2.5-flash')
        self.assertEqual(engine.model_name, 'gemini-2.5-flash')
        engine._client = MagicMock()
        with patch('apps.ai_core.common.base_engine.generate_with_budget', return_value=SimpleNamespace(text=None)):
            self.assertIsNone(engine.call_gemini_json('test'))
        self.assertEqual(engine.last_inference_status['status'], 'empty_response')
