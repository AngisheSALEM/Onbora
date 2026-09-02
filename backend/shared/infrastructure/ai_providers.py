import os
import json
import logging
from typing import Dict, Any, List
import requests

from shared.domain.ai_qualification import (
    IAIQualificationProvider,
    AIQualificationResult,
    BANTScore,
    COIEstimation,
    TieredPackage,
)

logger = logging.getLogger(__name__)


class MockAIQualificationAdapter(IAIQualificationProvider):
    """
    Adaptateur déterministe simulant parfaitement le livrable du Dev IA.
    Permet au Mobile et au Serveur de tourner avec 100% de réalisme sans dépendance bloquante.
    """

    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        name = enterprise_data.get('name', '').lower()
        sector = enterprise_data.get('sector', '').lower()
        size_str = str(enterprise_data.get('approximate_size', '10'))
        
        # Heuristique déterministe pour le brief
        budget = 20
        authority = 20
        need = 22
        timeline = 20

        if 'kiosque' in name or 'informel' in sector:
            budget = 5
            authority = 15
            timeline = 5
        elif 'clinique' in name or 'santé' in sector or 'hopital' in name:
            budget = 24
            authority = 22
            need = 25
            timeline = 23
        elif 'banque' in name or 'finance' in sector:
            budget = 25
            authority = 18
            need = 24
            timeline = 20

        score = BANTScore(
            budget_score=budget,
            authority_score=authority,
            need_score=need,
            timeline_score=timeline,
        )
        score.calculate_total()
        return score

    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        ent_name = enterprise_data.get('name', 'Entreprise B2B')
        sector = enterprise_data.get('sector', 'Services & PME')
        contact_name = enterprise_data.get('contact_name', 'Le Dirigeant')
        
        # 1. Évaluation BANT
        transcript_lower = raw_transcript.lower()
        budget = 22
        authority = 22
        need = 23
        timeline = 21

        if any(w in transcript_lower for w in ['pas de budget', 'trop cher', 'gratuit', 'aucun moyen']):
            budget = 8
        if any(w in transcript_lower for w in ['pas le décideur', 'je transmets à mon patron', 'pas mon rôle']):
            authority = 8
        if any(w in transcript_lower for w in ['l\'année prochaine', 'plus tard', 'horizon 2028', 'pas urgent']):
            timeline = 5

        bant = BANTScore(
            budget_score=budget,
            authority_score=authority,
            need_score=need,
            timeline_score=timeline,
        )
        bant.calculate_total()

        # 2. Calcul du Coût de l'Inaction (COI)
        # Estimation des effectifs et des heures de panne à partir du texte ou du secteur
        impacted_staff = 8
        downtime_hours = 6.0
        hourly_rate = 12.0
        lost_sales = 600.0

        if 'santé' in sector.lower() or 'médical' in sector.lower() or 'clinique' in ent_name.lower():
            impacted_staff = 15
            downtime_hours = 8.0
            hourly_rate = 18.0
            lost_sales = 1500.0
        elif 'banque' in sector.lower() or 'finance' in sector.lower():
            impacted_staff = 25
            downtime_hours = 4.0
            hourly_rate = 22.0
            lost_sales = 3000.0
        elif 'commerce' in sector.lower() or 'distribution' in sector.lower():
            impacted_staff = 6
            downtime_hours = 10.0
            hourly_rate = 10.0
            lost_sales = 1200.0

        coi = COIEstimation(
            impacted_employees=impacted_staff,
            downtime_hours_per_month=downtime_hours,
            hourly_wage_usd=hourly_rate,
            monthly_lost_sales_usd=lost_sales,
        )
        coi.compute()

        # 3. Construction des 3 Packages Tierés (Good / Better / Best)
        # Package 1 : Essentiel (Fibre Dédiée Pro 50M)
        p1_price = 180.0
        p1_cost = 110.0
        p1_margin = round(((p1_price - p1_cost) / p1_price) * 100, 1)
        p1_gain = round(coi.total_monthly_coi_usd - p1_price, 2)
        p1_roi = round((p1_gain / p1_price) * 100, 0)
        pack_essential = TieredPackage(
            tier="ESSENTIAL",
            name="Pack Connectivité Pro Essentiel",
            monthly_price_usd=p1_price,
            estimated_msp_cost_usd=p1_cost,
            gross_margin_percent=p1_margin,
            monthly_net_gain_usd=p1_gain,
            roi_percent=p1_roi,
            key_features=[
                "Fibre Optique Dédiée symétrique 50 Mbps",
                "Garantie de Temps de Rétablissement (GTR) 4h",
                "Routeur managé Cisco/MikroTik inclus",
            ],
            pitch="Élimine immédiatement les coupures réseau et garantit la stabilité de vos encaissements.",
            objection_killer="Secours 4G automatique inclus sans surcoût en cas de coupure physique.",
        )

        # Package 2 : Performance (Recommandé - Fibre 100M + M365 + Sécurité)
        p2_price = 320.0
        p2_cost = 175.0
        p2_margin = round(((p2_price - p2_cost) / p2_price) * 100, 1)
        p2_gain = round(coi.total_monthly_coi_usd - p2_price, 2)
        p2_roi = round((p2_gain / p2_price) * 100, 0)
        pack_performance = TieredPackage(
            tier="PERFORMANCE",
            name="Pack Entreprise Performance (Fibre 100M + M365)",
            monthly_price_usd=p2_price,
            estimated_msp_cost_usd=p2_cost,
            gross_margin_percent=p2_margin,
            monthly_net_gain_usd=p2_gain,
            roi_percent=p2_roi,
            key_features=[
                "Fibre Optique Dédiée symétrique 100 Mbps + Backup 4G",
                f"Suite Microsoft 365 Business ({impacted_staff} licences)",
                "Protection Antivirus EDR Cloud gérée par le MSP",
                "Support technique prioritaire 6j/7",
            ],
            pitch=f"Garantit 0 interruption pour vos {impacted_staff} collaborateurs et préserve {coi.total_monthly_coi_usd:,.0f} $/mois de chiffre d'affaires.",
            objection_killer=f"Pour 320 $/mois, vous récupérez {p2_gain:,.0f} $/mois net de productivité immédiatement mesurable.",
        )

        # Package 3 : Souverain (Fibre 200M + Cloud Backup + Cyberdefense + SLA 24/7)
        p3_price = 550.0
        p3_cost = 260.0
        p3_margin = round(((p3_price - p3_cost) / p3_price) * 100, 1)
        p3_gain = round(coi.total_monthly_coi_usd - p3_price, 2)
        p3_roi = round((p3_gain / p3_price) * 100, 0)
        pack_sovereign = TieredPackage(
            tier="SOVEREIGN",
            name="Pack Sérénité Totale & Cyberdéfense",
            monthly_price_usd=p3_price,
            estimated_msp_cost_usd=p3_cost,
            gross_margin_percent=p3_margin,
            monthly_net_gain_usd=p3_gain,
            roi_percent=p3_roi,
            key_features=[
                "Fibre Optique 200 Mbps avec double adduction physique",
                "Sauvegarde Cloud immuable anti-ransomware (1 To)",
                "Supervision SOC et astreinte 24h/24 7j/7",
                "Infogérance complète de tout votre parc informatique",
            ],
            pitch="La solution zéro compromis pour protéger votre réputation, vos données sensibles et garantir une disponibilité à 99.9%.",
            objection_killer="Audit de conformité et cyber-assurance partenaire inclus.",
        )

        # 4. Besoins et Objections
        detected_needs = [
            "Fibre Optique Dédiée et stable",
            f"Outils collaboratifs pour {impacted_staff} utilisateurs",
            "Sauvegarde automatique des données contre les pannes",
        ]
        detected_objections = [
            "Crainte du coût mensuel récurrent (OPEX)",
            "Peur des interruptions d'activité pendant l'installation",
        ]

        # 5. Executive Summary
        exec_summary = (
            f"Diagnostic pour {ent_name} ({sector}) : Les coupures actuelles génèrent un Coût de l'Inaction "
            f"estimé à {coi.total_monthly_coi_usd:,.0f} $/mois ({coi.annual_coi_usd:,.0f} $/an). "
            f"L'adoption du {pack_performance.name} à {pack_performance.monthly_price_usd:,.0f} $/mois "
            f"permet un gain net immédiat de {pack_performance.monthly_net_gain_usd:,.0f} $/mois (ROI de {pack_performance.roi_percent:.0f}%)."
        )

        # 6. Emails de Relance J+1 et J+4
        email_j1 = f"""Objet : Synthèse de notre échange & Plan d'optimisation pour {ent_name}

Bonjour {contact_name},

Je vous remercie pour notre échange de ce jour.

Comme convenu, voici les éléments financiers clés que nous avons identifiés ensemble :
• Coût mensuel des pannes et lenteurs actuelles : ~{coi.total_monthly_coi_usd:,.0f} $/mois (soit {coi.annual_coi_usd:,.0f} $/an de pertes de productivité et ventes).
• Solution recommandée : {pack_performance.name} à {pack_performance.monthly_price_usd:,.0f} $/mois.
• Gain net généré pour votre entreprise : +{pack_performance.monthly_net_gain_usd:,.0f} $/mois dès le premier mois.

Vous trouverez en pièce jointe la fiche de synthèse 1-Page. 
Pouvons-nous bloquer 10 minutes jeudi à 10h pour valider les prérequis techniques de raccordement ?

Bien cordialement,
Votre Conseiller MSP Orange Business"""

        email_j4 = f"""Objet : Suivi de votre raccordement - {ent_name}

Bonjour {contact_name},

Je reviens vers vous suite à notre échange sur la sécurisation de vos accès numériques.

Pour répondre à votre préoccupation concernant la continuité d'activité lors de l'installation :
Nos équipes techniques réalisent le basculement en soirée (heures non ouvrées) avec notre passerelle de secours 4G active, garantissant 0 minute d'interruption pour vos équipes.

Souhaitez-vous que notre ingénieur réseau effectue le test d'éligibilité final dès cette semaine ?

Bien cordialement,
Votre Conseiller MSP Orange Business"""

        # 7. Données d'Ingénierie pour le Handover Technique
        tech_specs = {
            "client_name": ent_name,
            "sector": sector,
            "site_address": enterprise_data.get('location', 'Kinshasa'),
            "contact_technique": contact_name,
            "recommended_package": pack_performance.name,
            "bandwidth_committed": "100 Mbps symétrique",
            "backup_solution": "Routeur 4G LTE automatique (Failover)",
            "sla_guarantee": "GTR 4h (Garantie de Temps de Rétablissement)",
            "estimated_users": impacted_staff,
            "rack_space_required": "2U dans baie existante",
            "public_ip_count": 1,
            "dns_migration_required": True,
            "m365_tenant_creation": True,
        }

        return AIQualificationResult(
            enterprise_name=ent_name,
            sector=sector,
            bant=bant,
            coi=coi,
            packages=[pack_essential, pack_performance, pack_sovereign],
            recommended_tier="PERFORMANCE",
            detected_needs=detected_needs,
            detected_objections=detected_objections,
            executive_summary=exec_summary,
            email_follow_up_j1=email_j1,
            email_follow_up_j4=email_j4,
            technical_handover_specs=tech_specs,
        )


class CoreAIHttpAdapter(IAIQualificationProvider):
    """
    Adaptateur réseau pour se connecter au microservice Core AI dès qu'il est actif.
    """
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv('CORE_AI_URL', 'http://127.0.0.1:8001/api/v1')
        self.fallback = MockAIQualificationAdapter()

    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        try:
            resp = requests.post(f"{self.base_url}/qualify/brief/", json=enterprise_data, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                score = BANTScore(**data)
                score.calculate_total()
                return score
        except Exception as e:
            logger.warning(f"Échec appel Core AI brief ({e}), utilisation du Mock fallback.")
        return self.fallback.qualify_lead_brief(enterprise_data)

    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        try:
            payload = {
                "raw_transcript": raw_transcript,
                "enterprise_data": enterprise_data
            }
            resp = requests.post(f"{self.base_url}/qualify/visit/", json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                # Mapping JSON vers DTO
                bant = BANTScore(**data['bant'])
                coi = COIEstimation(**data['coi'])
                packages = [TieredPackage(**p) for p in data.get('packages', [])]
                return AIQualificationResult(
                    enterprise_name=data.get('enterprise_name', enterprise_data.get('name', '')),
                    sector=data.get('sector', enterprise_data.get('sector', '')),
                    bant=bant,
                    coi=coi,
                    packages=packages,
                    recommended_tier=data.get('recommended_tier', 'PERFORMANCE'),
                    detected_needs=data.get('detected_needs', []),
                    detected_objections=data.get('detected_objections', []),
                    executive_summary=data.get('executive_summary', ''),
                    email_follow_up_j1=data.get('email_follow_up_j1', ''),
                    email_follow_up_j4=data.get('email_follow_up_j4', ''),
                    technical_handover_specs=data.get('technical_handover_specs', {}),
                )
        except Exception as e:
            logger.warning(f"Échec appel Core AI visit ({e}), utilisation du Mock fallback.")
        return self.fallback.qualify_visit(raw_transcript, enterprise_data)


def get_ai_qualification_provider() -> IAIQualificationProvider:
    """
    Factory pour instancier le bon provider selon la configuration d'environnement.
    """
    provider_name = os.getenv('AI_QUALIFICATION_PROVIDER', 'mock').lower()
    if provider_name in ['core_ai', 'gemini', 'remote']:
        return CoreAIHttpAdapter()
    return MockAIQualificationAdapter()
