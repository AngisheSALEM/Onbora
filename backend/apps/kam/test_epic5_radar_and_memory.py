import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from accounts.models import User
from sales.models import Enterprise, Evidence
from kam.models import RelationshipCoverage, AccountMemoryEvent, KamVisitReport, KamAppointment
from kam.services.radar_service import SignalRuleEvaluator
from kam.services.account_memory_service import AccountMemoryService


class Epic5RadarAndMemoryTestCase(APITestCase):
    """
    Test suite for Epic 5:
    1. Explainable Risk & Renewal Radar (Rule 1: Expiration J-90/120/180, Rule 2: Mono-Champion, Rule 3: Inactivity Decay)
    2. Account Memory & Handover Pack Service (Decisions, Promises, Incidents, Stakeholders map)
    3. REST API Endpoints (/accounts/<id>/memory/, /accounts/<id>/risk-signals/, /accounts/<id>/handover-pack/)
    """

    def setUp(self):
        self.kam_user = User.objects.create_user(
            username='kam_sophie', password='password123', role=User.KAM,
            first_name='Sophie', last_name='Lefevre'
        )
        self.kam_token = Token.objects.create(user=self.kam_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.kam_token.key}')

        self.enterprise = Enterprise.objects.create(
            name="Banque Centrale B2B",
            sector="Finance",
            segment="GRANDS_COMPTES",
            city="Kinshasa",
            annual_revenue=500000.0,
            contract_end_date=timezone.now().date() + datetime.timedelta(days=75)  # J-75 (< 90 days)
        )

    def test_signal_rule_evaluator_contract_renewal_critical(self):
        """Rule 1: Expiration <= 90 days triggers RULE_RENEWAL_URGENT with CRITICAL severity."""
        signals_data = SignalRuleEvaluator.evaluate_account_signals(self.enterprise.id)
        self.assertEqual(signals_data["enterprise_id"], self.enterprise.id)

        renewal_signals = [s for s in signals_data["signals"] if s["rule_code"] == "RULE_RENEWAL_URGENT"]
        self.assertTrue(len(renewal_signals) > 0)
        self.assertEqual(renewal_signals[0]["severity"], "CRITICAL")
        self.assertIn("expire dans 75 jours", renewal_signals[0]["detected_value"])
        self.assertEqual(signals_data["risk_level"], "CRITICAL")

    def test_signal_rule_evaluator_contract_renewal_warning_and_info(self):
        """Rule 1: Expiration between 91 and 120 days triggers WARNING; 121-180 triggers INFO."""
        # 1. J-110
        self.enterprise.contract_end_date = timezone.now().date() + datetime.timedelta(days=110)
        self.enterprise.save()
        data_110 = SignalRuleEvaluator.evaluate_account_signals(self.enterprise.id)
        rules_110 = [s["rule_code"] for s in data_110["signals"]]
        self.assertIn("RULE_RENEWAL_ACTIVE", rules_110)

        # 2. J-150
        self.enterprise.contract_end_date = timezone.now().date() + datetime.timedelta(days=150)
        self.enterprise.save()
        data_150 = SignalRuleEvaluator.evaluate_account_signals(self.enterprise.id)
        rules_150 = [s["rule_code"] for s in data_150["signals"]]
        self.assertIn("RULE_RENEWAL_PREPARATION", rules_150)

    def test_signal_rule_evaluator_mono_champion_and_inactivity(self):
        """Rule 2: Mono-champion detected when 1 champion and 0 economic buyers."""
        RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Marc DSI",
            contact_role="DSI",
            role_classification="CHAMPION",
            influence_level="HIGH"
        )
        signals_data = SignalRuleEvaluator.evaluate_account_signals(self.enterprise.id)
        mono_champ_signals = [s for s in signals_data["signals"] if s["rule_code"] == "RULE_MONO_CHAMPION"]
        self.assertTrue(len(mono_champ_signals) > 0)
        self.assertEqual(mono_champ_signals[0]["severity"], "CRITICAL")

        # Inactivity signal should also be present because no interaction occurred
        inactivity_signals = [s for s in signals_data["signals"] if s["rule_code"] == "RULE_INACTIVITY_DECAY"]
        self.assertTrue(len(inactivity_signals) > 0)
        self.assertEqual(inactivity_signals[0]["severity"], "WARNING")

    def test_signal_rule_evaluator_healthy_account(self):
        """An account with distant contract, balanced relationships, and recent visits is HEALTHY."""
        self.enterprise.contract_end_date = timezone.now().date() + datetime.timedelta(days=365)
        self.enterprise.save()

        # Create both Champion and Economic Buyer
        c1 = RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Marc DSI",
            contact_role="DSI",
            role_classification="CHAMPION",
            influence_level="HIGH",
            last_interaction_at=timezone.now() - datetime.timedelta(days=5)
        )
        c2 = RelationshipCoverage.objects.create(
            enterprise=self.enterprise,
            contact_name="Sarah DAF",
            contact_role="Directrice Financière",
            role_classification="ECONOMIC_BUYER",
            influence_level="HIGH",
            last_interaction_at=timezone.now() - datetime.timedelta(days=10)
        )

        signals_data = SignalRuleEvaluator.evaluate_account_signals(self.enterprise.id)
        self.assertEqual(signals_data["risk_level"], "HEALTHY")
        self.assertEqual(signals_data["signals_count"], 0)

    def test_account_memory_service_record_event_and_handover_pack(self):
        """Test recording memory events and generating comprehensive handover pack."""
        # 1. Record Decision
        dec_event = AccountMemoryService.record_event(
            enterprise_id=self.enterprise.id,
            user=self.kam_user,
            event_type='DECISION',
            summary="Arbitrage architecture SD-WAN retenue",
            details="Le comité exécutif a validé le passage sur topologie hybride MPLS + Internet dédié.",
            occurred_at=timezone.now() - datetime.timedelta(days=20)
        )
        self.assertIsNotNone(dec_event.id)
        self.assertEqual(dec_event.event_type, 'DECISION')

        # 2. Record Promise
        prom_event = AccountMemoryService.record_event(
            enterprise_id=self.enterprise.id,
            user=self.kam_user,
            event_type='PROMISE',
            summary="Engagement livraison sous 21 jours ouvrés pour le site secondaire",
            details="Confirmation par email du KAM accordant une pénalité SLA de 10% si retard supérieur à 30 jours.",
            occurred_at=timezone.now() - datetime.timedelta(days=15),
            is_critical=True
        )
        self.assertTrue(prom_event.is_critical)

        # 3. Record Incident
        inc_event = AccountMemoryService.record_event(
            enterprise_id=self.enterprise.id,
            user=self.kam_user,
            event_type='INCIDENT',
            summary="Coupure fibre suite travaux BTP sur l'avenue principale",
            details="Restauration en 2h15, rapport d'incident post-mortem partagé avec le DSI.",
            occurred_at=timezone.now() - datetime.timedelta(days=5)
        )

        # 4. Generate Handover Pack
        pack = AccountMemoryService.generate_handover_pack(
            enterprise_id=self.enterprise.id,
            outgoing_kam=self.kam_user
        )

        self.assertIn("Banque Centrale B2B", pack["handover_title"])
        self.assertEqual(pack["enterprise"]["id"], self.enterprise.id)
        self.assertEqual(len(pack["critical_watchpoints"]), 1)
        self.assertEqual(len(pack["active_promises"]), 1)
        self.assertEqual(len(pack["strategic_decisions"]), 1)
        self.assertIn("risk_signals", pack)

    def test_api_account_memory_list_create(self):
        """Test REST API endpoints: POST and GET /api/kam/accounts/<id>/memory/."""
        # POST new event
        url = reverse('account-memory-list-create', kwargs={'enterprise_id': self.enterprise.id})
        payload = {
            "event_type": "PROMISE",
            "summary": "Engagement tarifaire pluriannuel",
            "details": "Remise de 15% accordée sur la redevance mensuelle jusqu'en 2028",
            "is_critical": True
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["event_type"], "PROMISE")
        self.assertTrue(res.data["is_critical"])

        # GET event list
        res_get = self.client.get(url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_get.data), 1)
        self.assertEqual(res_get.data[0]["summary"], "Engagement tarifaire pluriannuel")

    def test_api_account_risk_signals_and_handover_pack(self):
        """Test REST API endpoints: GET /risk-signals/ and GET /handover-pack/."""
        # 1. Risk signals endpoint
        signals_url = reverse('account-risk-signals', kwargs={'enterprise_id': self.enterprise.id})
        res_sig = self.client.get(signals_url)
        self.assertEqual(res_sig.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sig.data["risk_level"], "CRITICAL")
        self.assertTrue(len(res_sig.data["signals"]) > 0)

        # 2. Handover pack endpoint
        handover_url = reverse('account-handover-pack', kwargs={'enterprise_id': self.enterprise.id})
        res_pack = self.client.get(handover_url)
        self.assertEqual(res_pack.status_code, status.HTTP_200_OK)
        self.assertIn("Dossier de Passation", res_pack.data["handover_title"])
        self.assertEqual(res_pack.data["enterprise"]["name"], "Banque Centrale B2B")
