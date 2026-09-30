from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from kam.models import ChurnRadarSnapshot, KamAppointment, KamVisitReport, PreCallBriefing
from kam.services.churn_radar_service import ChurnRadarService
from sales.models import Enterprise


SCENARIOS = (
    ('Logistique', 'Transport & Logistique', 'SD-WAN Managé Multi-Sites', 'Ouverture de deux agences à raccorder', '1 200 USD / mois'),
    ('Santé', 'Santé', 'Cloud Backup Datacenter Kinshasa', 'Sauvegardes des dossiers patients à sécuriser', '650 USD / mois'),
    ('Industrie', 'Industrie', 'CyberSOC 24/7 & Firewall Managé', 'Nouveaux équipements industriels à protéger', '1 800 USD / mois'),
    ('Distribution', 'Commerce & Distribution', 'Flotte Mobile Entreprise', 'Extension de la flotte commerciale de 30 lignes', '450 USD / mois'),
)


class Command(BaseCommand):
    help = 'Crée 16 comptes B2B de démonstration par KAM, avec churn, upsell et comptes sains. Réexécutable sans doublons.'

    def add_arguments(self, parser):
        parser.add_argument('--kam', help='Limiter le seed à un nom d’utilisateur KAM existant.')

    @transaction.atomic
    def handle(self, *args, **options):
        kams = User.objects.filter(role=User.KAM, is_active=True).order_by('pk')
        if options.get('kam'):
            kams = kams.filter(username=options['kam'])
        if not kams.exists():
            raise CommandError('Aucun KAM actif trouvé. Créez un KAM ou lancez seed_demo_users avant ce seed.')

        now = timezone.now()
        today = now.date()
        count = 0
        for kam in kams:
            for index in range(16):
                label, sector, solution, trigger, value = SCENARIOS[index % 4]
                cohort = index // 4
                at_risk = cohort in (0, 2)
                has_upsell = cohort in (1, 2)
                contract_end = today + timedelta(days=20 if cohort == 0 else 60 if cohort == 2 else 300)
                enterprise, _ = Enterprise.objects.update_or_create(
                    crm_id=f'DEMO-KAM-{kam.pk}-{index + 1:02d}',
                    defaults={
                        'name': f'Démo {label} {index + 1:02d} · {kam.username}',
                        'sector': sector, 'segment': 'PME' if kam.kam_specialization == 'PME' else 'GRAND_COMPTE',
                        'assigned_entity': 'KAM_OFFICE', 'assigned_kam': kam, 'assigned_at': now,
                        'annual_revenue': 650000 if kam.kam_specialization == 'PME' else 2500000 + index * 100000,
                        'employee_count': 35 + index * 5, 'site_count': 3,
                        'city': kam.location or 'Kinshasa', 'contact_name': f'Direction {label}',
                        'contact_role': 'Directeur des systèmes d’information',
                        'contact_email': f'contact-{index + 1}@demo-kam-{kam.pk}.example',
                        'current_connectivity': 'Fibre Pro', 'contract_end_date': contract_end,
                        'incident_count': 3 if cohort == 0 else 1 if cohort == 2 else 0,
                        'pain_level': 'Critique' if at_risk else 'Faible',
                        'telecom_budget_monthly': 3000 + index * 250,
                        'conversion_status': 'CONVERTED', 'converted_offer': 'Fibre Pro',
                        'converted_amount': 36000, 'converted_at': now - timedelta(days=200),
                        'existing_crm_data': {'demo_seed': 'kam_portfolios', 'current_operator': 'Orange', 'orange_contract_end_date': contract_end.isoformat()},
                    },
                )
                last_contact = now - timedelta(days=45 if cohort == 0 else 24 if cohort == 2 else 2)
                appointment, _ = KamAppointment.objects.update_or_create(
                    enterprise=enterprise, kam=kam, title='Démo · Dernière revue de compte',
                    defaults={'scheduled_at': last_contact, 'status': 'COMPLETED', 'visit_purpose': 'FOLLOW_UP'},
                )
                summary = 'Insatisfaction liée aux coupures réseau et au délai de résolution.' if at_risk else 'Services stables, satisfaction confirmée lors de la revue de compte.'
                report, _ = KamVisitReport.objects.update_or_create(
                    appointment=appointment,
                    defaults={'enterprise': enterprise, 'kam': kam, 'executive_summary': summary, 'confirmed_needs': [trigger] if has_upsell else []},
                )
                KamVisitReport.objects.filter(pk=report.pk).update(created_at=last_contact)
                if not at_risk:
                    KamAppointment.objects.update_or_create(
                        enterprise=enterprise, kam=kam, title='Démo · Prochaine revue de compte',
                        defaults={'scheduled_at': now + timedelta(days=7), 'status': 'SCHEDULED', 'visit_purpose': 'FOLLOW_UP'},
                    )
                assessment = ChurnRadarService.refresh_account_assessment(enterprise, use_ai=False)
                assessment.upsell_opportunities = [{
                    'solution': solution, 'trigger': trigger, 'estimated_value': value,
                    'talking_point': f'Proposer {solution} pour accompagner ce besoin, puis valider le périmètre et le budget avec la direction.',
                }] if has_upsell else []
                assessment.retention_plan = {
                    'urgency': 'IMMEDIATE_48H' if cohort == 0 else 'PLANNED_7D',
                    'action': 'Contacter le décideur, organiser une revue des incidents avec le support et convenir d’un plan de rétablissement avant le renouvellement.',
                    'email_draft': f'Bonjour,\n\nJe vous propose un point sur les incidents rencontrés et le renouvellement de votre contrat Fibre Pro. Nous pourrons convenir ensemble des actions et délais de résolution.\n\nBien cordialement,\n{kam.get_full_name() or kam.username}',
                } if at_risk else {}
                assessment.save(update_fields=['upsell_opportunities', 'retention_plan', 'updated_at'])
                PreCallBriefing.objects.update_or_create(
                    enterprise=enterprise, kam=kam,
                    defaults={'analysis_data': {
                        'company': {'province': enterprise.city, 'activity_arsp': sector},
                        'ai_summary': {'status': 'DEMO', 'overview': {'text': f'Compte B2B de démonstration du secteur {sector}. {summary} {trigger + "." if has_upsell else "La prochaine revue permettra de confirmer la satisfaction et les besoins."}'},
                                       'key_facts': [{'text': f'{enterprise.employee_count} collaborateurs répartis sur 3 sites.'}], 'contradictions': [], 'gaps': []},
                        'recommended_solutions': [{'name': solution if has_upsell else 'Fibre Pro', 'category': sector, 'description': trigger if has_upsell else 'Service actuellement souscrit.'}],
                        'evidence': [], 'sources': [],
                    }},
                )
                # Le même historique de démonstration est conservé lors des relances.
                for days_ago in (7, 30, 60, 90):
                    ChurnRadarSnapshot.objects.get_or_create(
                        enterprise=enterprise, calculated_at__date=today - timedelta(days=days_ago),
                        defaults={'calculated_at': now - timedelta(days=days_ago), 'health_score': assessment.health_score,
                                  'churn_risk_score': assessment.churn_risk_score, 'risk_level': assessment.risk_level},
                    )
                count += 1
        self.stdout.write(self.style.SUCCESS(f'{count} comptes de démonstration préparés. Les autres entreprises sont conservées.'))
