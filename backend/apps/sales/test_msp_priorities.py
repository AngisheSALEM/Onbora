from django.test import TestCase
from django.contrib.auth import get_user_model
from sales.models import Plaque, Enterprise, VisitPreparation, VisitReport
from kam.models import ProspectDossier
from sales.services.qualification_service import BANTQualificationService
from sales.services.follow_up_service import FollowUpEmailService
from twin.services.roi_calculator_service import ROICalculatorService
from kam.services.handover_service import TechnicalHandoverService
from shared.domain.ai_qualification import TieredPackage

User = get_user_model()


class MSPPrioritiesServicesTestCase(TestCase):
    def setUp(self):
        self.salesperson = User.objects.create_user(
            username='sales_test',
            password='testpassword',
            role='SALESPERSON'
        )
        self.plaque = Plaque.objects.create(
            code='KIN-GOMBE',
            name='Kinshasa (Gombe)',
            city='Kinshasa'
        )
        self.enterprise = Enterprise.objects.create(
            name='Clinique Reine Astrid',
            sector='Santé / Médical',
            approximate_size='25',
            location='Gombe, Kinshasa',
            plaque='Kinshasa (Gombe)',
            plaque_rel=self.plaque
        )
        self.prep = VisitPreparation.objects.create(
            enterprise=self.enterprise,
            salesperson=self.salesperson,
            meeting_objective='Audit connectivité et cybersécurité'
        )

    def test_bant_qualification_lead_brief(self):
        service = BANTQualificationService()
        result = service.evaluate_enterprise_brief(self.enterprise)
        
        self.assertIn('status', result)
        self.assertIn('total_score', result)
        self.assertEqual(result['status'], 'HOT_LEAD')
        self.assertFalse(result['is_disqualified'])

    def test_bant_qualification_disqualification(self):
        informal_enterprise = Enterprise.objects.create(
            name='Petit Kiosque Informel',
            sector='Informel / Rue',
            approximate_size='1',
            location='Marché'
        )
        service = BANTQualificationService()
        result = service.evaluate_enterprise_brief(informal_enterprise)
        
        self.assertEqual(result['status'], 'DISQUALIFIED')
        self.assertTrue(result['is_disqualified'])
        self.assertIsNotNone(result['disqualification_reason'])

    def test_roi_calculator_coi_and_profitability(self):
        coi = ROICalculatorService.calculate_custom_coi(
            impacted_employees=10,
            downtime_hours_per_month=5.0,
            hourly_wage_usd=15.0,
            monthly_lost_sales_usd=500.0
        )
        # Payroll loss = 10 * 5.0 * 15.0 = 750. Total = 750 + 500 = 1250
        self.assertEqual(coi['monthly_payroll_loss_usd'], 750.0)
        self.assertEqual(coi['total_monthly_coi_usd'], 1250.0)
        self.assertEqual(coi['annual_coi_usd'], 15000.0)

        pkg = TieredPackage(
            tier='PERFORMANCE',
            name='Pack Pro',
            monthly_price_usd=320.0,
            estimated_msp_cost_usd=175.0,
            gross_margin_percent=45.3,
            monthly_net_gain_usd=930.0,
            roi_percent=290.6,
            key_features=['Fibre 100M', 'M365']
        )
        eval_pkg = ROICalculatorService.evaluate_package_profitability(pkg, coi['total_monthly_coi_usd'])
        self.assertEqual(eval_pkg['monthly_net_gain_usd'], 930.0)
        self.assertTrue(eval_pkg['is_margin_compliant'])

    def test_visit_transcription_and_handover_pack(self):
        service = BANTQualificationService()
        transcript = "Rendez-vous très positif avec le médecin chef. Problème récurrent de coupure internet et besoin de M365."
        qual_res = service.process_visit_transcription(transcript, {
            'name': self.enterprise.name,
            'sector': self.enterprise.sector,
            'contact_name': 'Dr. Ilunga'
        })
        
        self.assertEqual(qual_res.recommended_tier, 'PERFORMANCE')
        self.assertEqual(len(qual_res.packages), 3)
        self.assertTrue(len(qual_res.email_follow_up_j1) > 0)

        # Rapport et Dossier
        report = VisitReport.objects.create(
            preparation=self.prep,
            raw_transcript=transcript,
            executive_summary=qual_res.executive_summary,
            confirmed_needs=qual_res.detected_needs,
            objections_raised=qual_res.detected_objections,
            follow_up_email_draft=qual_res.email_follow_up_j1,
            original_ai_output={
                'technical_handover_specs': qual_res.technical_handover_specs
            }
        )
        dossier = ProspectDossier.objects.create(
            visit_report=report,
            source=ProspectDossier.OUTBOUND_VISIT,
            contact_name='Dr. Ilunga',
            phone='+243810000000',
            rccm='CD/KIN/RCCM/24-B-1234',
            raw_conversation_data={
                'technical_handover_specs': qual_res.technical_handover_specs
            }
        )

        handover = TechnicalHandoverService.build_handover_pack(dossier)
        self.assertEqual(handover['client_identity']['company_name'], self.enterprise.name)
        self.assertEqual(handover['deployment_readiness']['estimated_time_to_deliver_days'], 5)
        self.assertTrue(handover['deployment_readiness']['is_rccm_verified'])
