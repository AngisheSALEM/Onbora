import io
import zipfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User
from sales.models import Enterprise
from kam.models import KamAppointment, KamVisitReport
from kam.services.meeting_report_service import extract_document


class MeetingReportTests(APITestCase):
    def setUp(self):
        self.kam = User.objects.create_user(username='report-kam', role=User.KAM)
        self.enterprise = Enterprise.objects.create(name='Entreprise terrain', assigned_kam=self.kam)
        self.appointment = KamAppointment.objects.create(
            enterprise=self.enterprise, kam=self.kam, title='Revue du compte', scheduled_at=timezone.now(),
        )
        self.client.force_authenticate(self.kam)
        self.base = f'/api/kam/appointments/{self.appointment.pk}'
        self.account_base = f'/api/kam/accounts/{self.enterprise.pk}'
        for target in (
            'apps.ai_core.rag_service.get_catalog_rag',
            'apps.ai_core.services.session_service.AISessionService',
            'kam.services.installed_offers_service.sync_installed_offer_on_signed_contract',
            'kam.commercial_intelligence_service.CommercialIntelligenceService.sync_briefing_after_visit',
        ):
            mocked = self.enterContext(patch(target))
            if target.endswith('get_catalog_rag'):
                mocked.return_value.search.return_value = []

    def prepare(self, payload=None, base=None):
        response = self.client.post(f'{base or self.base}/report-draft/', payload or {
            'notes': 'Le client demande une connexion de secours pour son siège.',
            'next_action': 'Demander une étude', 'owner': 'Avant-vente', 'due_date': '2026-11-10',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def save(self, prepared, base=None, **edits):
        return self.client.post(f'{base or self.base}/report-complete/', {
            **prepared['draft'], **edits, 'draft_token': prepared['draft_token'],
        }, format='json')

    def test_preview_has_no_report_or_status_side_effects(self):
        result = self.prepare()
        self.assertEqual(result['draft']['confirmed_needs'], ['Le client demande une connexion de secours pour son siège.'])
        self.assertFalse(KamVisitReport.objects.exists())
        self.appointment.refresh_from_db()
        self.enterprise.refresh_from_db()
        self.assertEqual(self.appointment.status, 'SCHEDULED')
        self.assertFalse(self.enterprise.is_visited)

    def test_reviewed_changes_and_source_are_persisted_once(self):
        prepared = self.prepare()
        response = self.save(prepared, executive_summary='Besoin de continuité du siège confirmé.', confirmed_needs=['Connexion de secours'])
        self.assertEqual(response.status_code, 201, response.data)
        report = KamVisitReport.objects.get()
        self.assertEqual(report.executive_summary, 'Besoin de continuité du siège confirmé.')
        self.assertEqual(report.confirmed_needs, ['Connexion de secours'])
        self.assertEqual(report.actions_todo, ['Demander une étude — Avant-vente — 2026-11-10'])
        self.assertEqual(report.crm_payload['source']['source_type'], 'NOTES')
        self.assertEqual(report.crm_payload['reviewed_by'], self.kam.pk)
        self.assertEqual(report.bant_scores['discovered_needs'], ['Connexion de secours'])
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'COMPLETED')
        self.assertEqual(self.save(prepared).status_code, 201)
        self.assertEqual(KamVisitReport.objects.count(), 1)

    def test_empty_source_and_invalid_action_date_are_rejected(self):
        for payload in ({}, {'notes': '  '}, {'next_action': 'Relance', 'due_date': 'demain'}, {'notes': 'Note', 'owner': 'Alice'}):
            response = self.client.post(f'{self.base}/report-draft/', payload, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(KamVisitReport.objects.exists())

    def test_action_only_does_not_confirm_a_need_or_invent_an_email(self):
        draft = self.prepare({'next_action': 'Relancer le client'})['draft']
        self.assertEqual(draft['confirmed_needs'], [])
        self.assertEqual(draft['follow_up_email_draft'], '')
        self.assertEqual(draft['actions_todo'], ['Relancer le client'])

    def test_brief_factual_note_remains_saveable(self):
        prepared = self.prepare({'notes': 'RAS'})
        self.assertEqual(prepared['draft']['executive_summary'], 'RAS')
        self.assertEqual(prepared['draft']['confirmed_needs'], [])
        self.assertEqual(self.save(prepared).status_code, 201)

    def test_proposal_and_technical_scope_are_not_customer_confirmation(self):
        with patch('apps.ai_core.meeting_report.service.MeetingReportEngine.call_gemini_json', return_value=None) as analyze:
            for source_type in ('PROPOSAL', 'TECHNICAL'):
                prepared = self.prepare({'source_type': source_type, 'document_name': 'offre.txt', 'document_text': 'Nous proposons une connexion de secours et un équipement de sauvegarde pour le siège du client.'})
                self.assertEqual(prepared['draft']['confirmed_needs'], [])
                self.assertEqual(prepared['draft']['actions_todo'], [])
                self.assertTrue(prepared['insights']['proposed_scope'])
            self.assertEqual(analyze.call_count, 2)

    def test_message_uses_qualification_but_stays_a_draft(self):
        note = 'Vous avez demandé une connexion de secours pour le siège.'
        with patch('apps.ai_core.meeting_report.service.MeetingReportEngine.call_gemini_json', return_value={'summary_points': [note], 'confirmed_needs': [note]}) as analyze:
            result = self.prepare({'source_type': 'MESSAGE', 'notes': note})
        self.assertEqual(result['draft']['confirmed_needs'], [note])
        self.assertIn('MESSAGE', analyze.call_args.args[0])
        self.assertFalse(KamVisitReport.objects.exists())

    def test_core_ai_cannot_add_unsupported_numbers_or_actions(self):
        note = 'Le client demande une connexion de secours pour son siège.'
        with patch('apps.ai_core.meeting_report.service.MeetingReportEngine.call_gemini_json', return_value={
            'summary_points': ['Budget validé de 50000 USD.'],
            'confirmed_needs': ['Le client commande 150 licences.'],
            'actions': ['Signer le contrat vendredi.'], 'decisions': ['Le client a signé.'],
        }):
            prepared = self.prepare({'notes': note})
        self.assertEqual(prepared['draft']['executive_summary'], note)
        self.assertEqual(prepared['draft']['confirmed_needs'], [note])
        self.assertEqual(prepared['draft']['actions_todo'], [])
        self.assertEqual(prepared['insights']['decisions'], [])

    def test_short_notes_and_actions_use_core_ai_and_remain_grounded(self):
        note = 'Transmettre l’étude mardi.'
        with patch('apps.ai_core.meeting_report.service.MeetingReportEngine.call_gemini_json', return_value={'actions': [note]}) as analyze:
            prepared = self.prepare({'notes': note})
        analyze.assert_called_once()
        self.assertEqual(prepared['draft']['actions_todo'], [note])
        self.assertIn(note, prepared['draft']['follow_up_email_draft'])
        self.assertTrue(prepared['insights']['clarification_questions'])

    def test_foreign_kam_is_denied_for_all_operations(self):
        other = User.objects.create_user(username='other-report-kam', role=User.KAM)
        self.client.force_authenticate(other)
        for base in (self.base, self.account_base):
            for operation in ('report-draft', 'report-complete', 'report-document'):
                self.assertEqual(self.client.post(f'{base}/{operation}/', {}).status_code, 403)

    def test_tampered_token_and_cross_context_token_are_rejected(self):
        prepared = self.prepare()
        altered = {**prepared, 'draft_token': prepared['draft_token'] + 'x'}
        self.assertEqual(self.save(altered).status_code, 400)
        self.assertEqual(self.save(prepared, self.account_base).status_code, 400)
        self.assertFalse(KamVisitReport.objects.exists())

    def test_account_report_is_created_only_on_validation_and_does_not_change_conversion(self):
        prepared = self.prepare(base=self.account_base)
        self.assertEqual(KamAppointment.objects.count(), 1)
        response = self.save(prepared, base=self.account_base)
        self.assertEqual(response.status_code, 201, response.data)
        report = KamVisitReport.objects.get()
        self.assertEqual(report.appointment.meeting_type, 'PHYSICAL')
        self.enterprise.refresh_from_db()
        self.assertEqual(self.enterprise.conversion_status, 'PROSPECT')
        self.assertEqual(self.save(prepared, base=self.account_base).status_code, 201)
        self.assertEqual(KamAppointment.objects.count(), 2)

    def test_existing_report_is_not_overwritten(self):
        KamVisitReport.objects.create(appointment=self.appointment, enterprise=self.enterprise, kam=self.kam, executive_summary='Rapport historique')
        self.assertEqual(self.save(self.prepare()).status_code, 400)
        self.assertEqual(KamVisitReport.objects.get().executive_summary, 'Rapport historique')

    def test_document_text_and_invalid_documents(self):
        response = self.client.post(f'{self.base}/report-document/', {'document': SimpleUploadedFile('notes.txt', 'Le client attend une étude.'.encode())}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['text'], 'Le client attend une étude.')
        for filename, body in [('script.exe', b'code'), ('scan.pdf', b'not a pdf'), ('notes.txt', b'')]:
            response = self.client.post(f'{self.base}/report-document/', {'document': SimpleUploadedFile(filename, body)}, format='multipart')
            self.assertEqual(response.status_code, 400)

    def test_docx_extraction_keeps_paragraphs(self):
        content = io.BytesIO()
        with zipfile.ZipFile(content, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Besoin exprimé</w:t></w:r></w:p><w:p><w:r><w:t>Suite à donner</w:t></w:r></w:p></w:body></w:document>')
        result = extract_document(SimpleUploadedFile('notes.docx', content.getvalue()))
        self.assertEqual(result['text'], 'Besoin exprimé\nSuite à donner')
