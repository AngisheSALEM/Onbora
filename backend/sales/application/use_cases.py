import os
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q, Count
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from datetime import datetime

from sales.models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession, ScraperCredential
from sales.domain.exceptions import (
    PlaqueNotFoundException,
    EnterpriseNotFoundException,
    VisitPreparationNotFoundException,
    LiveVisitSessionNotFoundException,
    VisitReportNotFoundException,
    ScraperCredentialNotFoundException,
)
from sales.application.dtos import (
    PlaqueDTO,
    PlaqueDetailDTO,
    EnterpriseDTO,
    EnterpriseMapDTO,
    EnterpriseBriefDTO,
    SalespersonActivityDTO,
    LiveCopilotTurnDTO,
    PostVisitReportResultDTO,
    CoreAIFeedbackDTO,
    VisitPreparationDTO,
    VisitReportDTO,
    VoiceUploadResultDTO,
    ScraperCredentialDTO,
)
from sales.infrastructure.core_ai_sales_client import CoreAISalesClient
from sales.infrastructure.scraper_service import CompanyScraperService
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from catalog.models import ServiceCatalog
from reporting.utils import log_demo_event
from shared.application.use_case import BaseUseCase

# Default OpenStreetMap coordinates for territorial hubs
PLAQUE_COORDINATES = {
    'KIN-GOMBE': ('Kinshasa (Gombe)', 'Kinshasa', -4.3033, 15.3083, 5.0),
    'KIN-LIMETE': ('Kinshasa (Limete)', 'Kinshasa', -4.3411, 15.3444, 7.0),
    'BZV-CENTRE': ('Brazzaville (Centre/Plateau)', 'Brazzaville', -4.2634, 15.2832, 6.0),
    'PNR-CENTRE': ('Pointe-Noire (Centre)', 'Pointe-Noire', -4.7977, 11.8504, 5.0),
    'LSH-CENTRE': ('Lubumbashi (Centre)', 'Lubumbashi', -11.6609, 27.4794, 8.0),
    'ABJ-PLATEAU': ('Abidjan (Plateau)', 'Abidjan', 5.3247, -4.0197, 6.0),
    'DKR-PLATEAU': ('Dakar (Plateau)', 'Dakar', 14.6708, -17.4381, 6.0),
}


class ListPlaquesUseCase(BaseUseCase[Any, List[PlaqueDTO]]):
    def execute(self, request: Any = None) -> List[PlaqueDTO]:
        # S'assurer que les plaques de référence existent en base
        if not Plaque.objects.exists():
            self._seed_default_plaques()

        plaques = Plaque.objects.filter(is_active=True).prefetch_related('enterprises', 'assigned_salespersons')
        results = []
        for p in plaques:
            total_leads = p.enterprises.count()
            ready_leads = p.enterprises.filter(is_ready_for_conversion=True).count()
            assigned_names = [f"{u.first_name} {u.last_name}".strip() or u.username for u in p.assigned_salespersons.all()]
            results.append(PlaqueDTO(
                id=p.id,
                code=p.code,
                name=p.name,
                city=p.city,
                center_latitude=p.latitude,
                center_longitude=p.longitude,
                radius_km=p.radius_km,
                total_enterprises=total_leads,
                ready_count=ready_leads,
                assigned_salespersons_names=assigned_names
            ))
        return results

    def _seed_default_plaques(self):
        for code, (name, city, lat, lng, radius) in PLAQUE_COORDINATES.items():
            plaque_obj, _ = Plaque.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "city": city,
                    "latitude": lat,
                    "longitude": lng,
                    "radius_km": radius,
                    "is_active": True
                }
            )
            # Lier les entreprises existantes correspondant au nom
            Enterprise.objects.filter(plaque__icontains=city).update(plaque_rel=plaque_obj)


class GetPlaqueDetailUseCase(BaseUseCase[int, PlaqueDetailDTO]):
    def execute(self, plaque_id: int) -> PlaqueDetailDTO:
        try:
            plaque = Plaque.objects.prefetch_related('enterprises', 'assigned_salespersons').get(pk=plaque_id)
        except Plaque.DoesNotExist:
            raise PlaqueNotFoundException(plaque_id)

        leads_dto = []
        for e in plaque.enterprises.all():
            leads_dto.append(EnterpriseDTO(
                id=e.id,
                name=e.name,
                website=e.website,
                sector=e.sector,
                approximate_size=e.approximate_size,
                location=e.location,
                plaque=e.plaque,
                plaque_id=plaque.id,
                latitude=e.latitude,
                longitude=e.longitude,
                scraping_status=e.scraping_status,
                scraped_data=e.scraped_data,
                ai_hypotheses=e.ai_hypotheses,
                ai_tailored_pitch=e.ai_tailored_pitch,
                ai_key_questions=e.ai_key_questions,
                ai_potential_objections=e.ai_potential_objections,
                is_ready_for_conversion=e.is_ready_for_conversion,
                conversion_score=e.conversion_score,
                recommended_solution=e.recommended_solution,
                existing_crm_data=e.existing_crm_data,
                siren=e.siren,
                siret=e.siret,
                kaabu_organization_id=e.kaabu_organization_id,
                arrowsphere_tenant_id=e.arrowsphere_tenant_id,
                sync_status=e.sync_status,
                last_sync_date=e.last_sync_date
            ))

        assigned = [
            {"id": u.id, "username": u.username, "full_name": f"{u.first_name} {u.last_name}".strip() or u.username}
            for u in plaque.assigned_salespersons.all()
        ]

        return PlaqueDetailDTO(
            id=plaque.id,
            code=plaque.code,
            name=plaque.name,
            city=plaque.city,
            center_latitude=plaque.latitude,
            center_longitude=plaque.longitude,
            radius_km=plaque.radius_km,
            total_enterprises=len(leads_dto),
            ready_count=len([l for l in leads_dto if l.is_ready_for_conversion]),
            assigned_salespersons=assigned,
            leads=leads_dto
        )


class ScrapeAndEnrichEnterpriseUseCase(BaseUseCase[Tuple[int, Any], EnterpriseDTO]):
    """
    1. Récolte les données publiques (Site web + Réseaux sociaux).
    2. Envoie au microservice Core AI pour générer les hypothèses, le pitch et les objections.
    3. Met à jour la fiche entreprise et génère la fiche de préparation pré-visite.
    """
    def execute(self, params: Tuple[int, Any]) -> EnterpriseDTO:
        enterprise_id, user = params
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        # 1. Scraping
        scraper = CompanyScraperService()
        scraped_data = scraper.scrape_enterprise(
            enterprise_name=enterprise.name,
            website=enterprise.website,
            sector=enterprise.sector or "Services B2B"
        )
        enterprise.scraped_data = scraped_data
        enterprise.scraping_status = "SCRAPED"

        # 2. Appel Core AI pour génération d'hypothèses
        ai_client = CoreAISalesClient()
        ai_result = ai_client.generate_sales_hypotheses(
            company_name=enterprise.name,
            sector=enterprise.sector or "Services B2B",
            website=enterprise.website,
            scraped_data=scraped_data
        )

        enterprise.ai_hypotheses = ai_result.get("hypotheses", [])
        enterprise.ai_tailored_pitch = ai_result.get("tailored_pitch", "")
        enterprise.ai_key_questions = ai_result.get("key_questions", [])
        enterprise.ai_potential_objections = ai_result.get("potential_objections", [])
        enterprise.save()

        # 3. Synchronisation automatique avec la fiche VisitPreparation
        prep, _ = VisitPreparation.objects.get_or_create(
            enterprise=enterprise,
            defaults={
                "salesperson": user if (user and user.is_authenticated) else None,
                "meeting_objective": f"Présenter les solutions de connectivité Fibre et Cloud Orange B2B adaptées à {enterprise.name}",
                "hypothesis_to_verify": "\n".join(enterprise.ai_hypotheses),
                "custom_pitch": enterprise.ai_tailored_pitch,
                "key_questions": "\n".join(enterprise.ai_key_questions)
            }
        )
        if prep:
            prep.hypothesis_to_verify = "\n".join(enterprise.ai_hypotheses)
            prep.custom_pitch = enterprise.ai_tailored_pitch
            prep.key_questions = "\n".join(enterprise.ai_key_questions)
            prep.save()

        log_demo_event(
            'SCRAPING_ENRICHED',
            f"Fiche enrichie et hypothèses IA générées pour : {enterprise.name}",
            user=user if (user and user.is_authenticated) else None,
            metadata={"enterprise_id": enterprise.id, "provider": ai_result.get("provider")}
        )

        return EnterpriseDTO(
            id=enterprise.id,
            name=enterprise.name,
            website=enterprise.website,
            sector=enterprise.sector,
            approximate_size=enterprise.approximate_size,
            location=enterprise.location,
            plaque=enterprise.plaque,
            plaque_id=enterprise.plaque_rel_id,
            latitude=enterprise.latitude,
            longitude=enterprise.longitude,
            scraping_status=enterprise.scraping_status,
            scraped_data=enterprise.scraped_data,
            ai_hypotheses=enterprise.ai_hypotheses,
            ai_tailored_pitch=enterprise.ai_tailored_pitch,
            ai_key_questions=enterprise.ai_key_questions,
            ai_potential_objections=enterprise.ai_potential_objections,
            is_ready_for_conversion=enterprise.is_ready_for_conversion,
            conversion_score=enterprise.conversion_score,
            recommended_solution=enterprise.recommended_solution,
            existing_crm_data=enterprise.existing_crm_data,
            siren=enterprise.siren,
            siret=enterprise.siret,
            kaabu_organization_id=enterprise.kaabu_organization_id,
            arrowsphere_tenant_id=enterprise.arrowsphere_tenant_id,
            sync_status=enterprise.sync_status,
            last_sync_date=enterprise.last_sync_date
        )


class ProcessLiveCopilotTurnUseCase(BaseUseCase[Tuple[int, str, Any], LiveCopilotTurnDTO]):
    """
    Copilote en Temps Réel pendant la visite :
    Reçoit un nouveau segment vocal/textuel, interroge le Core AI en continu
    et retourne la proposition commerciale ajustée pour affichage instantané sur mobile.
    """
    def execute(self, params: Tuple[int, str, Any]) -> LiveCopilotTurnDTO:
        enterprise_id, new_transcript_chunk, user = params

        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        prep, _ = VisitPreparation.objects.get_or_create(
            enterprise=enterprise,
            defaults={"salesperson": user if (user and user.is_authenticated) else None}
        )

        session, _ = LiveVisitSession.objects.get_or_create(
            preparation=prep,
            enterprise=enterprise,
            salesperson=user if (user and user.is_authenticated) else prep.salesperson,
            session_status='ACTIVE'
        )

        # Accumulation du texte
        if new_transcript_chunk:
            session.live_transcript = (session.live_transcript + " " + new_transcript_chunk).strip()

        # Inférence Core AI en direct
        ai_client = CoreAISalesClient()
        live_res = ai_client.analyze_live_copilot_turn(
            transcript_text=session.live_transcript,
            enterprise_name=enterprise.name,
            sector=enterprise.sector or "Services B2B",
            accumulated_needs=session.detected_needs,
            accumulated_objections=session.detected_objections
        )

        session.detected_needs = live_res.get("detected_needs", [])
        session.detected_objections = live_res.get("detected_objections", [])
        session.live_proposition = live_res.get("realtime_proposition", {})
        session.save()

        return LiveCopilotTurnDTO(
            session_id=session.id,
            enterprise_id=enterprise.id,
            enterprise_name=enterprise.name,
            active_sentiment=live_res.get("active_sentiment", "En discussion"),
            detected_needs=session.detected_needs,
            detected_objections=session.detected_objections,
            realtime_proposition=session.live_proposition
        )


class GenerateVisitReportWithAIUseCase(BaseUseCase[Tuple[int, Optional[str], Any], PostVisitReportResultDTO]):
    """
    Génère le compte-rendu définitif de la visite via le Core AI,
    l'enregistre dans VisitReport et transmet le dossier au KAM (ProspectDossier & BusinessTwin).
    """
    def execute(self, params: Tuple[int, Optional[str], Any]) -> PostVisitReportResultDTO:
        prep_id, explicit_transcript, user = params

        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            raise VisitPreparationNotFoundException(prep_id)

        # Récupérer la transcription accumulée ou passée explicitement
        transcript = explicit_transcript or ""
        live_session = LiveVisitSession.objects.filter(preparation=prep).order_by('-updated_at').first()
        if not transcript and live_session:
            transcript = live_session.live_transcript

        if not transcript:
            transcript = f"Rendez-vous commercial avec la direction de {prep.enterprise.name} pour qualifier les besoins de connectivité et collaboration."

        # 1. Appel Core AI pour synthèse complète
        ai_client = CoreAISalesClient()
        salesperson_name = f"{user.first_name} {user.last_name}".strip() if (user and user.is_authenticated) else "Commercial Orange"
        ai_report = ai_client.generate_post_visit_report(
            full_transcript=transcript,
            enterprise_name=prep.enterprise.name,
            prep_objective=prep.meeting_objective,
            salesperson_name=salesperson_name
        )

        # 2. Création / Mise à jour du VisitReport
        report, _ = VisitReport.objects.get_or_create(
            preparation=prep,
            defaults={
                "raw_transcript": transcript,
                "executive_summary": ai_report.get("executive_summary", ""),
                "confirmed_needs": ai_report.get("confirmed_needs", []),
                "objections_raised": ai_report.get("objections_raised", []),
                "actions_todo": ai_report.get("actions_todo", []),
                "follow_up_email_draft": ai_report.get("follow_up_email_draft", ""),
                "original_ai_output": ai_report.get("raw_ai_payload", {})
            }
        )
        report.raw_transcript = transcript
        report.executive_summary = ai_report.get("executive_summary", report.executive_summary)
        report.confirmed_needs = ai_report.get("confirmed_needs", report.confirmed_needs)
        report.objections_raised = ai_report.get("objections_raised", report.objections_raised)
        report.actions_todo = ai_report.get("actions_todo", report.actions_todo)
        report.follow_up_email_draft = ai_report.get("follow_up_email_draft", report.follow_up_email_draft)
        report.original_ai_output = ai_report.get("raw_ai_payload", report.original_ai_output)
        report.save()

        # Marquer la session live comme terminée
        if live_session:
            live_session.session_status = 'COMPLETED'
            live_session.save()

        # 3. Transmission automatique au KAM (ProspectDossier & BusinessTwin)
        transmit_usecase = TransmitVisitReportUseCase()
        dossier_id = transmit_usecase.execute((report.id, user))

        log_demo_event(
            'REPORT_GENERATED_AI',
            f"Rapport de visite généré par Core AI et transmis au backoffice KAM pour : {prep.enterprise.name}",
            user=user if (user and user.is_authenticated) else None,
            metadata={"report_id": report.id, "dossier_id": dossier_id}
        )

        return PostVisitReportResultDTO(
            report_id=report.id,
            dossier_id=dossier_id,
            enterprise_name=prep.enterprise.name,
            executive_summary=report.executive_summary,
            confirmed_needs=report.confirmed_needs,
            objections_raised=report.objections_raised,
            actions_todo=report.actions_todo,
            follow_up_email_draft=report.follow_up_email_draft
        )


class SubmitCoreAIFeedbackUseCase(BaseUseCase[Tuple[int, int, str, Any], CoreAIFeedbackDTO]):
    """
    Enregistre les retours d'évaluation humaine (note 1-5 étoiles, remarques)
    et les transmet au Core AI pour alimenter le dataset d'amélioration continue.
    """
    def execute(self, params: Tuple[int, int, str, Any]) -> CoreAIFeedbackDTO:
        report_id, rating, comments, user = params

        try:
            report = VisitReport.objects.get(pk=report_id)
        except VisitReport.DoesNotExist:
            raise VisitReportNotFoundException(report_id)

        from django.utils import timezone
        report.ai_feedback_rating = rating
        report.ai_feedback_comments = comments
        report.ai_feedback_sent_at = timezone.now()
        report.save()

        # Envoi au Core AI
        ai_client = CoreAISalesClient()
        corrected_output = {
            "executive_summary": report.executive_summary,
            "confirmed_needs": report.confirmed_needs,
            "objections_raised": report.objections_raised,
            "actions_todo": report.actions_todo
        }
        feedback_res = ai_client.submit_learning_feedback(
            report_id=report.id,
            original_ai_output=report.original_ai_output,
            human_corrected_output=corrected_output,
            rating=rating,
            comments=comments
        )

        log_demo_event(
            'AI_FEEDBACK_SUBMITTED',
            f"Feedback d'amélioration Core AI enregistré pour le rapport #{report.id} (Note: {rating}/5)",
            user=user if (user and user.is_authenticated) else None,
            metadata={"report_id": report.id, "rating": rating}
        )

        return CoreAIFeedbackDTO(
            report_id=report.id,
            rating=rating,
            comments=comments,
            status=feedback_res.get("status", "SUCCESS"),
            submitted_at=report.ai_feedback_sent_at.isoformat()
        )


# --- Legacy Use Cases Conservés et Adaptés ---

class SearchEnterprisesUseCase(BaseUseCase[str, List[Enterprise]]):
    def execute(self, query: str) -> List[Enterprise]:
        query = query.strip()
        if not query:
            return list(Enterprise.objects.all())

        # 1. Search in CRM Kaabu
        from sales.integrations.kaabu import KaabuClient
        kaabu_results = []
        try:
            client = KaabuClient()
            kaabu_results = client.search_organizations(name=query)
        except Exception:
            pass

        # 2. Synchronize Kaabu results into the local database
        for item in kaabu_results:
            kaabu_id = item.get("id")
            if kaabu_id:
                Enterprise.objects.update_or_create(
                    kaabu_organization_id=kaabu_id,
                    defaults={
                        "name": item.get("name"),
                        "website": item.get("website", ""),
                        "sector": item.get("sector", ""),
                        "approximate_size": item.get("size", ""),
                        "location": item.get("location", ""),
                        "siren": item.get("siren", ""),
                        "siret": item.get("siret", ""),
                        "sync_status": "SYNCED"
                    }
                )

        matched_ids = [item.get("id") for item in kaabu_results if item.get("id")]
        queryset = Enterprise.objects.filter(
            Q(name__icontains=query) | Q(sector__icontains=query) | Q(plaque__icontains=query) | Q(kaabu_organization_id__in=matched_ids)
        )

        # 3. Fallback mock generation if not found
        if not queryset.exists():
            self._create_mock_enterprise(query)
            queryset = Enterprise.objects.filter(name__icontains=query)

        return list(queryset)

    def _create_mock_enterprise(self, name: str) -> Enterprise:
        name_lower = name.lower()
        website = f"https://www.{name_lower.replace(' ', '')}.cg"
        sector = "Services aux entreprises"
        size = "20-99 employés"
        location = "Kinshasa"
        plaque = "Kinshasa (Gombe)"
        lat, lng = -4.3033, 15.3083
        score = 88
        sol = "Fibre Optique Pro + Microsoft 365"

        if any(k in name_lower for k in ["médical", "clinique", "cabinet", "hôpital", "médecin", "docteur", "santé"]):
            sector = "Médical / Santé"
            location = "Kinshasa (Gombe)"
            plaque = "Kinshasa (Gombe)"
            lat, lng = -4.3045, 15.3060
            score = 92
            sol = "Fibre Sécurisée + Hébergement HDS"
        elif any(k in name_lower for k in ["tech", "soft", "digital", "numérique", "mine", "cuivre"]):
            sector = "Technologie / Mines"
            location = "Lubumbashi"
            plaque = "Lubumbashi (Centre)"
            lat, lng = -11.6609, 27.4794
            size = "100-499 employés"
            score = 95
            sol = "SD-WAN Multi-sites + Cyberdéfense Orange"
        elif any(k in name_lower for k in ["store", "super", "boutique", "vente", "commerce"]):
            sector = "Commerce / Retail"
            location = "Brazzaville"
            plaque = "Brazzaville (Centre/Plateau)"
            lat, lng = -4.2634, 15.2832
            size = "2-19 employés"
            score = 82
            sol = "Fibre Pro + Téléphonie Fixe VoIP"

        return Enterprise.objects.create(
            name=name,
            website=website,
            sector=sector,
            approximate_size=size,
            location=location,
            plaque=plaque,
            latitude=lat,
            longitude=lng,
            is_ready_for_conversion=True,
            conversion_score=score,
            recommended_solution=sol,
            existing_crm_data={"crm_status": "PROSPECT", "last_contact": "Jamais"}
        )



class GetEnterprisesForMapUseCase(BaseUseCase[Tuple[Optional[str], bool, Optional[str]], List[EnterpriseMapDTO]]):
    def execute(self, params: Tuple[Optional[str], bool, Optional[str]]) -> List[EnterpriseMapDTO]:
        plaque, ready_only, search_query = params
        queryset = Enterprise.objects.all()

        if plaque and plaque.strip() and plaque.lower() != 'all':
            queryset = queryset.filter(Q(plaque__icontains=plaque.strip()) | Q(plaque_rel__name__icontains=plaque.strip()))

        if ready_only:
            queryset = queryset.filter(is_ready_for_conversion=True)

        if search_query and search_query.strip():
            q = search_query.strip()
            queryset = queryset.filter(
                Q(name__icontains=q) | Q(sector__icontains=q) | Q(location__icontains=q)
            )

        results = []
        for e in queryset:
            lat = e.latitude or -4.3033
            lng = e.longitude or 15.3083
            crm_status = e.existing_crm_data.get("crm_status", "PROSPECT") if e.existing_crm_data else "PROSPECT"
            results.append(EnterpriseMapDTO(
                id=e.id,
                name=e.name,
                sector=e.sector or "Services B2B",
                approximate_size=e.approximate_size or "10-49 employés",
                location=e.location or e.plaque,
                plaque=e.plaque,
                latitude=lat,
                longitude=lng,
                is_ready_for_conversion=e.is_ready_for_conversion,
                conversion_score=e.conversion_score,
                recommended_solution=e.recommended_solution or "Fibre Optique Pro Orange + Microsoft 365",
                existing_crm_status=crm_status,
            ))

        return results


class GetEnterpriseBriefUseCase(BaseUseCase[Tuple[int, Any], EnterpriseBriefDTO]):
    def execute(self, params: Tuple[int, Any]) -> EnterpriseBriefDTO:
        enterprise_id, user = params
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        prep = VisitPreparation.objects.filter(enterprise=enterprise).order_by('-created_at').first()
        if not prep:
            prep = VisitPreparation.objects.create(
                enterprise=enterprise,
                salesperson=user if (user and user.is_authenticated) else None,
                meeting_objective=f"Qualifier l'éligibilité aux offres Orange B2B et proposer le raccordement Fibre Pro.",
                hypothesis_to_verify="\n".join(enterprise.ai_hypotheses) if enterprise.ai_hypotheses else (
                    f"L'entreprise {enterprise.name} ({enterprise.sector}) nécessite une bascule vers Orange Business."
                ),
                custom_pitch=enterprise.ai_tailored_pitch or f"Présenter l'offre {enterprise.recommended_solution}.",
                key_questions="\n".join(enterprise.ai_key_questions) if enterprise.ai_key_questions else (
                    "1. Quelle est votre connexion actuelle ?\n2. Combien de postes connectés ?"
                )
            )

        services = ServiceCatalog.objects.all()[:3]
        rec_services = [
            {"id": s.id, "name": s.name, "category": s.category, "description": s.description, "benefits": s.benefits}
            for s in services
        ]

        return EnterpriseBriefDTO(
            enterprise_id=enterprise.id,
            enterprise_name=enterprise.name,
            sector=enterprise.sector or "Services B2B",
            approximate_size=enterprise.approximate_size or "Non précisée",
            location=enterprise.location or enterprise.plaque,
            plaque=enterprise.plaque,
            conversion_score=enterprise.conversion_score,
            recommended_solution=enterprise.recommended_solution,
            meeting_objective=prep.meeting_objective,
            hypothesis_to_verify=prep.hypothesis_to_verify,
            custom_pitch=prep.custom_pitch,
            key_questions=prep.key_questions,
            ai_hypotheses=enterprise.ai_hypotheses,
            ai_potential_objections=enterprise.ai_potential_objections,
            recommended_catalog_services=rec_services,
        )


class GetSalespersonActivityUseCase(BaseUseCase[Any, SalespersonActivityDTO]):
    def execute(self, user: Any) -> SalespersonActivityDTO:
        if not user or not user.is_authenticated:
            return SalespersonActivityDTO(
                active_meetings=[
                    {"id": 1, "enterprise_name": "Clinique Reine Astrid", "scheduled_date": "Aujourd'hui à 14:30", "objective": "Fibre Pro & Cloud", "status": "IN_PROGRESS"}
                ],
                recent_reports=[
                    {"id": 1, "enterprise_name": "Pharmacie du Centre", "date": "Hier", "summary": "Intérêt confirmé.", "status": "TRANSMIS_KAM"}
                ],
                total_visits_count=18,
                total_transmitted_count=14,
                conversion_rate=77.8
            )

        preparations = VisitPreparation.objects.filter(salesperson=user).order_by('-created_at')[:10]
        reports = VisitReport.objects.filter(preparation__salesperson=user).order_by('-created_at')[:10]

        active_meetings = [
            {
                "id": p.id,
                "enterprise_name": p.enterprise.name,
                "scheduled_date": p.scheduled_date.strftime('%d/%m/%Y %H:%M') if p.scheduled_date else p.created_at.strftime('%d/%m/%Y'),
                "objective": p.meeting_objective,
                "status": "SCHEDULED"
            }
            for p in preparations
        ]

        recent_reports = [
            {
                "id": r.id,
                "enterprise_name": r.preparation.enterprise.name,
                "date": r.created_at.strftime('%d/%m/%Y'),
                "summary": r.executive_summary,
                "status": "REPORTED"
            }
            for r in reports
        ]

        total_visits = preparations.count()
        total_transmitted = reports.count()
        conversion_rate = round((total_transmitted / total_visits * 100), 1) if total_visits > 0 else 0.0

        return SalespersonActivityDTO(
            active_meetings=active_meetings,
            recent_reports=recent_reports,
            total_visits_count=total_visits,
            total_transmitted_count=total_transmitted,
            conversion_rate=conversion_rate,
        )


class CreateVisitPreparationUseCase(BaseUseCase[Tuple[int, Any], VisitPreparation]):
    def execute(self, params: Tuple[int, Any]) -> VisitPreparation:
        enterprise_id, user = params
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        prep = VisitPreparation.objects.create(
            enterprise=enterprise,
            salesperson=user if (user and user.is_authenticated) else None,
            meeting_objective=f"Qualifier l'éligibilité réseau et les besoins de collaboration pour {enterprise.name}.",
            hypothesis_to_verify="\n".join(enterprise.ai_hypotheses) if enterprise.ai_hypotheses else (
                f"L'entreprise {enterprise.name} utilise des connexions non professionnelles."
            ),
            custom_pitch=enterprise.ai_tailored_pitch or "Mettre en avant notre offre Fibre Optique Pro Orange B2B.",
            key_questions="\n".join(enterprise.ai_key_questions) if enterprise.ai_key_questions else "1. Quelle est votre connexion ?"
        )
        return prep


class CreateVisitReportUseCase(BaseUseCase[Tuple[int, str, Optional[str], Any], VisitReport]):
    def execute(self, params: Tuple[int, str, Optional[str], Any]) -> VisitReport:
        prep_id, raw_transcript, audio_file_path, user = params
        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            raise VisitPreparationNotFoundException(prep_id)

        exec_summary = "Rendez-vous qualitatif. Le client confirme des lenteurs de réseau et souhaite s'équiper d'une offre Fibre Pro Orange B2B."
        confirmed_needs = ["Fibre Optique Pro", "Microsoft 365 Pro & Teams"]
        objections = ["Coût mensuel"]
        actions = ["Envoyer devis de fibre", "Planifier démo Microsoft 365"]

        email_draft = (
            f"Bonjour,\n\nMerci pour le temps accordé lors de notre rencontre chez {prep.enterprise.name}. "
            f"Nous étudions vos éligibilités Fibre Orange B2B et vous transmettons nos préconisations.\n\nCordialement."
        )

        report, created = VisitReport.objects.get_or_create(
            preparation=prep,
            defaults={
                "raw_transcript": raw_transcript or "Discussion de conversation commerciale.",
                "executive_summary": exec_summary,
                "confirmed_needs": confirmed_needs,
                "objections_raised": objections,
                "actions_todo": actions,
                "follow_up_email_draft": email_draft,
                "audio_file_path": audio_file_path or None
            }
        )

        if not created:
            report.raw_transcript = raw_transcript or report.raw_transcript
            if audio_file_path:
                report.audio_file_path = audio_file_path
            report.save()

        return report


class TransmitVisitReportUseCase(BaseUseCase[Tuple[int, Any], int]):
    def execute(self, params: Tuple[int, Any]) -> int:
        report_id, user = params
        try:
            report = VisitReport.objects.get(pk=report_id)
        except VisitReport.DoesNotExist:
            raise VisitReportNotFoundException(report_id)

        enterprise = report.preparation.enterprise
        problems = report.objections_raised
        tools = []

        profile = {
            "sector": enterprise.sector or "Services",
            "company_size_estimate": enterprise.approximate_size or "2-19 employés",
            "locations_count": 1,
            "current_problems": problems,
            "current_tools": tools,
            "company_name": enterprise.name
        }

        dossier, created = ProspectDossier.objects.get_or_create(
            visit_report=report,
            defaults={
                "source": ProspectDossier.OUTBOUND_VISIT,
                "status": ProspectDossier.NEW,
                "raw_conversation_data": {
                    "profile": profile,
                    "executive_summary": report.executive_summary
                }
            }
        )

        from kam.dispatch_engine import dispatch_dossier
        dispatch_dossier(dossier)

        recommended_services_data = []
        current_state = [report.executive_summary]
        proposed_state = ["Mise en place des solutions Orange Business B2B"]
        roadmap = ["Étape 1: Audit technique", "Étape 2: Raccordement Fibre Orange", "Étape 3: Déploiement Cloud"]

        for need_name in report.confirmed_needs:
            try:
                s = ServiceCatalog.objects.get(name__icontains=need_name[:10])
                recommended_services_data.append({
                    "service_id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "priority": "HIGH",
                    "reasoning": s.description
                })
            except ServiceCatalog.DoesNotExist:
                pass

        BusinessTwin.objects.get_or_create(
            prospect_dossier=dossier,
            defaults={
                "current_state": current_state,
                "proposed_state": proposed_state,
                "recommended_services": recommended_services_data,
                "roadmap": roadmap
            }
        )

        log_demo_event(
            'DOSSIER_TRANSMITTED',
            f"Rapport de visite transmis au KAM pour: {report.preparation.enterprise.name}",
            user=user if (user and user.is_authenticated) else None,
            metadata={"report_id": report.id, "dossier_id": dossier.id}
        )

        return dossier.id


class ProcessVoiceUploadUseCase(BaseUseCase[Tuple[Any, Optional[int], Any], VoiceUploadResultDTO]):
    def execute(self, params: Tuple[Any, Optional[int], Any]) -> VoiceUploadResultDTO:
        audio_file, prep_id, user = params

        enterprise_name = "le client"
        if prep_id:
            try:
                prep = VisitPreparation.objects.get(pk=prep_id)
                enterprise_name = prep.enterprise.name
            except VisitPreparation.DoesNotExist:
                pass

        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'voice_uploads'), exist_ok=True)
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'voice_uploads'), base_url='/media/voice_uploads/')
        filename = fs.save(audio_file.name, audio_file)
        uploaded_file_url = fs.url(filename)
        full_audio_path = fs.path(filename)

        from sales.whisper_service import transcribe_audio_file
        whisper_res = transcribe_audio_file(full_audio_path)
        transcript = whisper_res.get("text") or (
            f"Discussion commerciale chez {enterprise_name} : "
            "Le prospect confirme le besoin de raccorder ses locaux en Fibre Optique Pro Orange B2B avec basculement 4G, "
            "de sécuriser son réseau par Firewall et de migrer sa messagerie vers Microsoft 365 Pro & Teams."
        )

        log_demo_event(
            'AUDIO_RECORDED',
            f"Fichier audio de visite téléversé et transcrit via Whisper ({whisper_res.get('provider', 'whisper')}) pour: {enterprise_name}",
            user=user,
            metadata={"filename": filename, "file_url": uploaded_file_url, "provider": whisper_res.get("provider")}
        )

        return VoiceUploadResultDTO(
            audio_file_path=uploaded_file_url,
            transcript=transcript,
            provider=whisper_res.get("provider", "whisper")
        )
