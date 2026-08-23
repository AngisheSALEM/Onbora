from typing import List, Dict, Any, Optional, Tuple
from reporting.models import DemoEvent
from kam.models import ProspectDossier
from reporting.application.dtos import DemoEventDTO, DemoStatsDTO
from shared.application.use_case import BaseUseCase


class LogDemoEventUseCase(BaseUseCase[Tuple[str, str, Optional[Any], Optional[Dict[str, Any]]], Optional[DemoEvent]]):
    def execute(self, params: Tuple[str, str, Optional[Any], Optional[Dict[str, Any]]]) -> Optional[DemoEvent]:
        event_type, description, user, metadata = params
        if metadata is None:
            metadata = {}
        try:
            return DemoEvent.objects.create(
                event_type=event_type,
                description=description,
                user=user,
                metadata=metadata
            )
        except Exception as e:
            print(f"Error logging demo event: {e}")
            return None


from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from reporting.models import DemoEvent
from kam.models import ProspectDossier
from sales.models import Enterprise, VisitReport, Plaque
from accounts.models import User
from reporting.application.dtos import DemoEventDTO, DemoStatsDTO
from shared.application.use_case import BaseUseCase


class LogDemoEventUseCase(BaseUseCase[Tuple[str, str, Optional[Any], Optional[Dict[str, Any]]], Optional[DemoEvent]]):
    def execute(self, params: Tuple[str, str, Optional[Any], Optional[Dict[str, Any]]]) -> Optional[DemoEvent]:
        event_type, description, user, metadata = params
        if metadata is None:
            metadata = {}
        try:
            return DemoEvent.objects.create(
                event_type=event_type,
                description=description,
                user=user,
                metadata=metadata
            )
        except Exception as e:
            print(f"Error logging demo event: {e}")
            return None


class GetDemoStatsUseCase(BaseUseCase[Any, DemoStatsDTO]):
    def execute(self, request: Any = None) -> DemoStatsDTO:
        # Base database counts
        total_dossiers_db = ProspectDossier.objects.count()
        inbound_count_db = ProspectDossier.objects.filter(source=ProspectDossier.INBOUND_CONVERSATION).count()
        outbound_count_db = ProspectDossier.objects.filter(source=ProspectDossier.OUTBOUND_VISIT).count()

        accepted_count_db = ProspectDossier.objects.filter(status__in=[
            ProspectDossier.ACCEPTED, ProspectDossier.PROVISIONING, ProspectDossier.COMPLETED, ProspectDossier.TRAINING
        ]).count()
        review_count_db = ProspectDossier.objects.filter(status__in=[
            ProspectDossier.IN_REVIEW, ProspectDossier.ESTIMATE_PREPARED, ProspectDossier.NEGOTIATION
        ]).count()
        new_count_db = ProspectDossier.objects.filter(status__in=[
            ProspectDossier.NEW, ProspectDossier.DISPATCHED, ProspectDossier.QUALIFYING, ProspectDossier.DRAFT
        ]).count()

        total_enterprises = Enterprise.objects.count()
        total_reports = VisitReport.objects.count()

        # Display counts (scaled with real + demo data baseline for realistic charts)
        base_total = max(total_dossiers_db, 14)
        base_inbound = max(inbound_count_db, 8)
        base_outbound = max(outbound_count_db, 6)
        base_accepted = max(accepted_count_db, 4)
        base_review = max(review_count_db, 6)
        base_new = max(new_count_db, 4)

        conversion_rate = round((base_accepted / base_total) * 100, 1)

        # 1. Funnel Stages Breakdown
        identified_total = max(total_enterprises + base_total, 38)
        qualified_total = max(int(identified_total * 0.72), base_total)
        proposals_total = max(int(qualified_total * 0.65), base_review + base_accepted)
        negotiation_total = max(int(proposals_total * 0.60), base_accepted + 2)
        converted_total = base_accepted

        funnel_stages = [
            {
                "id": "identified",
                "name": "1. Découverte & Inscription",
                "subtitle": "Leads identifiés (Web, Scraping & Terrain)",
                "count": identified_total,
                "percentage": 100,
                "drop_rate": round(((identified_total - qualified_total) / identified_total) * 100, 1),
                "color": "#3B82F6"
            },
            {
                "id": "qualified",
                "name": "2. Qualification & Diagnostic IA",
                "subtitle": "Besoins confirmés & Architecture Cible",
                "count": qualified_total,
                "percentage": round((qualified_total / identified_total) * 100, 1),
                "drop_rate": round(((qualified_total - proposals_total) / qualified_total) * 100, 1),
                "color": "#6366F1"
            },
            {
                "id": "proposal",
                "name": "3. Offre & Devis Généré",
                "subtitle": "Proposition personnalisée envoyée",
                "count": proposals_total,
                "percentage": round((proposals_total / identified_total) * 100, 1),
                "drop_rate": round(((proposals_total - negotiation_total) / proposals_total) * 100, 1),
                "color": "#8B5CF6"
            },
            {
                "id": "negotiation",
                "name": "4. En Négociation / Validation KAM",
                "subtitle": "Revue commerciale et technique",
                "count": negotiation_total,
                "percentage": round((negotiation_total / identified_total) * 100, 1),
                "drop_rate": round(((negotiation_total - converted_total) / negotiation_total) * 100, 1),
                "color": "#F59E0B"
            },
            {
                "id": "converted",
                "name": "5. Convertis & Actifs",
                "subtitle": "Contrat validé, Raccordé ou en Provisioning",
                "count": converted_total,
                "percentage": round((converted_total / identified_total) * 100, 1),
                "drop_rate": 0.0,
                "color": "#10B981"
            },
        ]

        # 2. Drop-off Metrics & Reasons
        total_unconverted = identified_total - converted_total
        drop_off_metrics = {
            "total_unconverted": total_unconverted,
            "overall_drop_rate": round((total_unconverted / identified_total) * 100, 1),
            "critical_abandon_count": 6,
            "pipeline_recovery_potential": "48 500 $ MRR",
            "top_reasons": [
                {
                    "reason": "Dossier administratif incomplet (RCCM / KYC manquant)",
                    "count": 11,
                    "percentage": 32,
                    "severity": "CRITICAL"
                },
                {
                    "reason": "Devis envoyé mais non consulté / Non validé (> 5 jours)",
                    "count": 8,
                    "percentage": 24,
                    "severity": "WARNING"
                },
                {
                    "reason": "Abandon au cours du Diagnostic IA (Session interrompue)",
                    "count": 7,
                    "percentage": 21,
                    "severity": "WARNING"
                },
                {
                    "reason": "Objections budgétaires / Décision différée au trimestre suivant",
                    "count": 5,
                    "percentage": 15,
                    "severity": "NORMAL"
                },
                {
                    "reason": "Inéligibilité technique / Attente extension de plaque fibre",
                    "count": 3,
                    "percentage": 8,
                    "severity": "NORMAL"
                }
            ]
        }

        # 3. Unconverted Clients List (Actionable drop-offs for Back-Office)
        unconverted_clients = []

        # First add real DB dossiers that are not accepted
        real_dossiers = ProspectDossier.objects.exclude(status__in=[
            ProspectDossier.ACCEPTED, ProspectDossier.COMPLETED, ProspectDossier.TRAINING
        ]).select_related('kam', 'conversation', 'visit_report')[:10]

        for d in real_dossiers:
            c_name = d.contact_name or "Client Onbora"
            comp_name = "Entreprise Partenaire"
            if d.conversation and hasattr(d.conversation, 'client') and d.conversation.client:
                comp_name = d.conversation.client.username or comp_name
            elif d.visit_report and hasattr(d.visit_report, 'preparation') and d.visit_report.preparation:
                if d.visit_report.preparation.enterprise:
                    comp_name = d.visit_report.preparation.enterprise.name

            unconverted_clients.append({
                "id": d.id,
                "company_name": comp_name,
                "contact_name": c_name,
                "phone": d.phone or "+243 81 000 0000",
                "email": f"contact@{comp_name.lower().replace(' ', '')}.cd",
                "source": "INBOUND" if d.source == ProspectDossier.INBOUND_CONVERSATION else "OUTBOUND",
                "status": d.status,
                "status_display": d.get_status_display(),
                "drop_off_stage": "Dossier incomplet - En attente RCCM" if not d.is_complete else "Proposition commerciale en cours de négociation",
                "days_inactive": 3,
                "urgency": "WARNING" if not d.is_complete else "NORMAL",
                "conversion_score": 78,
                "estimated_mrr": "650 $ / mois",
                "recommended_action": "Relancer par WhatsApp pour pièces justificatives",
                "assigned_kam": f"{d.kam.first_name} {d.kam.last_name}" if d.kam else "Non assigné",
                "sector": "Services & Conseil"
            })

        # Add rich contextual leads if DB has few items
        curated_leads = [
            {
                "id": 101,
                "company_name": "Banque Commerciale du Congo (Agence Gombe)",
                "contact_name": "Marc Kabengele (DSI)",
                "phone": "+243 82 455 1290",
                "email": "m.kabengele@bcdc-group.cd",
                "source": "INBOUND",
                "status": "ESTIMATE_PREPARED",
                "status_display": "Proposition commerciale rédigée",
                "drop_off_stage": "Devis Fibre Dédiée 100M envoyé il y a 6 jours sans réponse",
                "days_inactive": 6,
                "urgency": "CRITICAL",
                "conversion_score": 92,
                "estimated_mrr": "1 450 $ / mois",
                "recommended_action": "Appel direct du Superviseur + Proposition d'alignement tarifaire",
                "assigned_kam": "Alain Mbuyi",
                "sector": "Banque & Finance"
            },
            {
                "id": 102,
                "company_name": "Socimex Distribution RDC",
                "contact_name": "Fatou Diallo (Directrice Achat)",
                "phone": "+243 89 778 3311",
                "email": "f.diallo@socimex.cd",
                "source": "OUTBOUND",
                "status": "IN_REVIEW",
                "status_display": "En revue / Qualification",
                "drop_off_stage": "Dossier bloqué : Numéro RCCM et statuts manquants",
                "days_inactive": 4,
                "urgency": "WARNING",
                "conversion_score": 85,
                "estimated_mrr": "890 $ / mois",
                "recommended_action": "Envoyer lien sécurisé de téléversement RCCM par WhatsApp",
                "assigned_kam": "Sarah Tshiala",
                "sector": "Commerce & Distribution"
            },
            {
                "id": 103,
                "company_name": "Clinique Universitaire de Kinshasa",
                "contact_name": "Dr. Patrick Mutombo",
                "phone": "+243 99 344 8820",
                "email": "p.mutombo@clinique-kin.cd",
                "source": "INBOUND",
                "status": "QUALIFYING",
                "status_display": "Diagnostic IA interrompu",
                "drop_off_stage": "Abandon à l'étape de choix des options de redondance 4G Backup",
                "days_inactive": 2,
                "urgency": "NORMAL",
                "conversion_score": 79,
                "estimated_mrr": "520 $ / mois",
                "recommended_action": "Régénérer et envoyer la fiche Diagnostic Cible simplifiée",
                "assigned_kam": "Non assigné",
                "sector": "Santé & Médical"
            },
            {
                "id": 104,
                "company_name": "Logistique Transit Congo (LTC)",
                "contact_name": "Christian Mwamba (Gérant)",
                "phone": "+243 81 556 9901",
                "email": "c.mwamba@ltc-rdc.com",
                "source": "OUTBOUND",
                "status": "NEGOTIATION",
                "status_display": "En négociation",
                "drop_off_stage": "Objection formulée sur le coût d'installation initiale (Frais d'accès)",
                "days_inactive": 8,
                "urgency": "CRITICAL",
                "conversion_score": 88,
                "estimated_mrr": "1 150 $ / mois",
                "recommended_action": "Activer la remise commerciale 'Pack Promo Plaque Limete' (-50% FAI)",
                "assigned_kam": "Alain Mbuyi",
                "sector": "Industrie & Logistique"
            },
            {
                "id": 105,
                "company_name": "Cabinet Juridique LexCongo",
                "contact_name": "Me Clarisse Ntumba",
                "phone": "+243 84 112 4477",
                "email": "clarisse@lexcongo.law",
                "source": "INBOUND",
                "status": "NEW",
                "status_display": "Nouveau lead non contacté",
                "drop_off_stage": "Inscrit via le portail en ligne depuis 3 jours sans affectation KAM",
                "days_inactive": 3,
                "urgency": "WARNING",
                "conversion_score": 81,
                "estimated_mrr": "450 $ / mois",
                "recommended_action": "Assigner immédiatement au KAM de la zone Gombe",
                "assigned_kam": "Non assigné",
                "sector": "Services & Conseil"
            }
        ]

        for lead in curated_leads:
            if len(unconverted_clients) < 8:
                unconverted_clients.append(lead)

        # 4. Activity Timeline (7-day activity metrics)
        activity_timeline = [
            {"date": "Lun", "day": "17 Aoû", "inbound": 5, "outbound": 8, "conversions": 2, "dropoffs": 1, "volume": 13},
            {"date": "Mar", "day": "18 Aoû", "inbound": 7, "outbound": 11, "conversions": 3, "dropoffs": 2, "volume": 18},
            {"date": "Mer", "day": "19 Aoû", "inbound": 9, "outbound": 14, "conversions": 4, "dropoffs": 2, "volume": 23},
            {"date": "Jeu", "day": "20 Aoû", "inbound": 6, "outbound": 12, "conversions": 2, "dropoffs": 3, "volume": 18},
            {"date": "Ven", "day": "21 Aoû", "inbound": 12, "outbound": 16, "conversions": 5, "dropoffs": 2, "volume": 28},
            {"date": "Sam", "day": "22 Aoû", "inbound": 8, "outbound": 6, "conversions": 3, "dropoffs": 1, "volume": 14},
            {"date": "Dim", "day": "23 Aoû", "inbound": 4, "outbound": 2, "conversions": 1, "dropoffs": 0, "volume": 6},
        ]

        # 5. Zone Distribution
        zone_distribution = [
            {"zone": "Kinshasa - Gombe (Plaque 01)", "leads": 16, "conversions": 6, "unconverted": 10, "mrr": "8 400 $"},
            {"zone": "Limete Industriel (Plaque 02)", "leads": 12, "conversions": 4, "unconverted": 8, "mrr": "6 200 $"},
            {"zone": "Ngaliema / Macampagne (Plaque 03)", "leads": 9, "conversions": 3, "unconverted": 6, "mrr": "3 900 $"},
            {"zone": "Kintambo Magasin (Plaque 04)", "leads": 7, "conversions": 2, "unconverted": 5, "mrr": "2 800 $"},
            {"zone": "Lubumbashi Centre (Plaque 05)", "leads": 5, "conversions": 1, "unconverted": 4, "mrr": "2 100 $"},
        ]

        # 6. Sector Distribution
        sector_distribution = [
            {"sector": "Banque & Finance", "count": 11, "percentage": 28},
            {"sector": "Commerce & Distribution", "count": 9, "percentage": 23},
            {"sector": "Services & Conseil", "count": 8, "percentage": 20},
            {"sector": "Industrie & Logistique", "count": 6, "percentage": 15},
            {"sector": "Santé & Éducation", "count": 5, "percentage": 14},
        ]

        # 7. Strategic KPIs
        kpis = {
            "avg_cycle_days": 3.8,
            "pipeline_potential_arr": "148 500 $",
            "active_kam_count": 3,
            "fastest_conversion": "24h (Portail Inbound)",
            "average_deal_mrr": "750 $",
            "active_plaques_count": 5,
        }

        # 8. Recent Event Logs
        recent_logs = []
        for log in DemoEvent.objects.all()[:20]:
            recent_logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })

        return DemoStatsDTO(
            total_dossiers=base_total,
            inbound_count=base_inbound,
            outbound_count=base_outbound,
            status_counts={
                "NEW": base_new,
                "IN_REVIEW": base_review,
                "ACCEPTED": base_accepted
            },
            conversion_rate=conversion_rate,
            recent_logs=recent_logs,
            funnel_stages=funnel_stages,
            drop_off_metrics=drop_off_metrics,
            unconverted_clients=unconverted_clients,
            activity_timeline=activity_timeline,
            zone_distribution=zone_distribution,
            sector_distribution=sector_distribution,
            kpis=kpis
        )


class GetDemoLogsUseCase(BaseUseCase[Any, List[Dict[str, Any]]]):
    def execute(self, request: Any = None) -> List[Dict[str, Any]]:
        logs = []
        for log in DemoEvent.objects.all():
            logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })
        return logs

