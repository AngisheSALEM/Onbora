import os
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q, Count
from django.core.files.storage import FileSystemStorage
from django.conf import settings

from sales.models import Enterprise, VisitPreparation, VisitReport, ScraperCredential
from sales.domain.exceptions import (
    EnterpriseNotFoundException,
    VisitPreparationNotFoundException,
    VisitReportNotFoundException,
    ScraperCredentialNotFoundException,
)
from sales.application.dtos import (
    EnterpriseDTO,
    EnterpriseMapDTO,
    EnterpriseBriefDTO,
    PlaqueDTO,
    SalespersonActivityDTO,
    VisitPreparationDTO,
    VisitReportDTO,
    VoiceUploadResultDTO,
    ScraperCredentialDTO,
)
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from catalog.models import ServiceCatalog
from reporting.utils import log_demo_event
from shared.application.use_case import BaseUseCase

# Default OpenStreetMap coordinates for territorial hubs
PLAQUE_COORDINATES = {
    'Kinshasa (Gombe)': (-4.3033, 15.3083),
    'Kinshasa (Limete)': (-4.3411, 15.3444),
    'Brazzaville (Centre/Plateau)': (-4.2634, 15.2832),
    'Pointe-Noire (Centre)': (-4.7977, 11.8504),
    'Lubumbashi (Centre)': (-11.6609, 27.4794),
    'Abidjan (Plateau)': (5.3247, -4.0197),
    'Dakar (Plateau)': (14.6708, -17.4381),
}


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

        # 3. Search locally across all plaques
        matched_ids = [item.get("id") for item in kaabu_results if item.get("id")]
        queryset = Enterprise.objects.filter(
            Q(name__icontains=query) | Q(sector__icontains=query) | Q(plaque__icontains=query) | Q(kaabu_organization_id__in=matched_ids)
        )

        # 4. Fallback mock generation if not found
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
            queryset = queryset.filter(plaque__icontains=plaque.strip())

        if ready_only:
            queryset = queryset.filter(is_ready_for_conversion=True)

        if search_query and search_query.strip():
            q = search_query.strip()
            queryset = queryset.filter(
                Q(name__icontains=q) | Q(sector__icontains=q) | Q(location__icontains=q)
            )

        # If database is empty, seed demo enterprises for OpenStreetMap
        if not queryset.exists() and not search_query:
            self._seed_default_map_enterprises()
            queryset = Enterprise.objects.all()
            if plaque and plaque.strip() and plaque.lower() != 'all':
                queryset = queryset.filter(plaque__icontains=plaque.strip())

        results = []
        for e in queryset:
            # Fallback coordinates if missing
            lat = e.latitude
            lng = e.longitude
            if lat is None or lng is None:
                default_coords = PLAQUE_COORDINATES.get(e.plaque, (-4.3033, 15.3083))
                # Add slight offset based on ID
                lat = default_coords[0] + ((e.id % 7) - 3) * 0.003
                lng = default_coords[1] + ((e.id % 5) - 2) * 0.003
                e.latitude = lat
                e.longitude = lng
                e.save()

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

    def _seed_default_map_enterprises(self):
        demo_data = [
            ("Clinique Reine Astrid", "Santé / Médical", "50-100 employés", "Kinshasa (Gombe)", "Kinshasa (Gombe)", -4.3045, 15.3060, True, 94, "Fibre Sécurisée + Hébergement HDS"),
            ("Société Congolaise de Banque", "Banque / Finance", "150+ employés", "Kinshasa (Gombe)", "Kinshasa (Gombe)", -4.3015, 15.3120, True, 96, "SD-WAN Haute Disponibilité + EDR"),
            ("Pharmacie du Centre", "Santé / Retail", "10-20 employés", "Kinshasa (Gombe)", "Kinshasa (Gombe)", -4.3072, 15.3041, True, 88, "Fibre Pro + Microsoft 365"),
            ("Trans-Congo Logistique", "Transport / Logistique", "40-80 employés", "Kinshasa (Limete)", "Kinshasa (Limete)", -4.3411, 15.3444, True, 89, "Fibre Pro + Flotte Mobile 4G/5G"),
            ("Brazza Tech Solutions", "Technologie / Informatique", "15-30 employés", "Brazzaville (Plateau)", "Brazzaville (Centre/Plateau)", -4.2634, 15.2832, True, 91, "Cloud Orange + Teams Téléphonie"),
            ("Pointe-Noire Import Export", "Négoce / Maritime", "35-70 employés", "Pointe-Noire Centre", "Pointe-Noire (Centre)", -4.7977, 11.8504, True, 86, "Fibre Optique Dédiée + Firewall"),
            ("Katanga Mining Services", "Mines / Industrie", "200+ employés", "Lubumbashi Centre", "Lubumbashi (Centre)", -11.6609, 27.4794, True, 95, "Liaison Satellite & Fibre Dédiée"),
        ]
        for name, sector, size, loc, plaque, lat, lng, ready, score, sol in demo_data:
            Enterprise.objects.create(
                name=name,
                sector=sector,
                approximate_size=size,
                location=loc,
                plaque=plaque,
                latitude=lat,
                longitude=lng,
                is_ready_for_conversion=ready,
                conversion_score=score,
                recommended_solution=sol,
                existing_crm_data={"crm_status": "QUALIFIÉ_IA", "last_contact": "Récemment"}
            )


class GetEnterpriseBriefUseCase(BaseUseCase[Tuple[int, Any], EnterpriseBriefDTO]):
    def execute(self, params: Tuple[int, Any]) -> EnterpriseBriefDTO:
        enterprise_id, user = params
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        prep = VisitPreparation.objects.filter(enterprise=enterprise).order_by('-created_at').first()
        if not prep:
            # Generate AI brief automatically
            prep = VisitPreparation.objects.create(
                enterprise=enterprise,
                salesperson=user if (user and user.is_authenticated) else None,
                meeting_objective=f"Qualifier l'éligibilité aux offres Orange B2B et proposer le raccordement Fibre Pro.",
                hypothesis_to_verify=(
                    f"L'entreprise {enterprise.name} ({enterprise.sector}) est en forte activité sur sa plaque ({enterprise.plaque}). "
                    "Leurs liaisons internet actuelles limitent le travail collaboratif et nécessitent une bascule vers Orange Business."
                ),
                custom_pitch=(
                    f"Présenter l'offre {enterprise.recommended_solution} avec engagement de garantie de temps de rétablissement (GTR 4h) "
                    "et migration fluide des adresses e-mails vers Microsoft 365 Pro."
                ),
                key_questions=(
                    "1. Quelle est votre facture mensuelle télécoms / internet actuelle ?\n"
                    "2. Avez-vous déjà subi des interruptions de service critiques ?\n"
                    "3. Combien de postes informatiques doivent être raccordés en simultané ?"
                )
            )

        # Recommend Orange B2B catalog services
        services = ServiceCatalog.objects.all()[:3]
        rec_services = [
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "description": s.description,
                "benefits": s.benefits,
            }
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
            recommended_catalog_services=rec_services,
        )


class ListPlaquesUseCase(BaseUseCase[Any, List[PlaqueDTO]]):
    def execute(self, request: Any = None) -> List[PlaqueDTO]:
        plaques_data = []
        for plaque_name, (lat, lng) in PLAQUE_COORDINATES.items():
            total = Enterprise.objects.filter(plaque__icontains=plaque_name.split(' ')[0]).count()
            ready = Enterprise.objects.filter(plaque__icontains=plaque_name.split(' ')[0], is_ready_for_conversion=True).count()
            plaques_data.append(PlaqueDTO(
                name=plaque_name,
                display_name=plaque_name,
                total_enterprises=total,
                ready_count=ready,
                center_latitude=lat,
                center_longitude=lng,
            ))
        return plaques_data


class GetSalespersonActivityUseCase(BaseUseCase[Any, SalespersonActivityDTO]):
    def execute(self, user: Any) -> SalespersonActivityDTO:
        if not user or not user.is_authenticated:
            # Return demo activity
            return SalespersonActivityDTO(
                active_meetings=[
                    {
                        "id": 1,
                        "enterprise_name": "Clinique Reine Astrid",
                        "scheduled_date": "Aujourd'hui à 14:30",
                        "objective": "Présentation Fibre Pro & Cloud Santé",
                        "status": "IN_PROGRESS"
                    },
                    {
                        "id": 2,
                        "enterprise_name": "Société Congolaise de Banque",
                        "scheduled_date": "Demain à 10:00",
                        "objective": "Audit Sécurité & SD-WAN",
                        "status": "CONFIRMED"
                    }
                ],
                recent_reports=[
                    {
                        "id": 1,
                        "enterprise_name": "Pharmacie du Centre",
                        "date": "Hier",
                        "summary": "Intérêt confirmé pour 5 postes Microsoft 365 + Fibre 50M.",
                        "status": "TRANSMIS_KAM"
                    }
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
            hypothesis_to_verify=(
                f"L'entreprise {enterprise.name} utilise actuellement des solutions grand public (ADSL/Box). "
                "Leur croissance récente nécessite une interconnexion réseau stable et des outils collaboratifs professionnels."
            ),
            custom_pitch=(
                f"Mettre en avant notre offre Fibre Optique Pro Orange B2B pour garantir un débit symétrique et stable, "
                "ainsi que Microsoft 365 pour structurer la collaboration interne."
            ),
            key_questions=(
                "1. Quelle est votre connexion internet principale actuelle ? Avez-vous des coupures ?\n"
                "2. Comment échangez-vous vos fichiers entre collègues ?\n"
                "3. Avez-vous un outil de visioconférence et de chat d'entreprise ?"
            )
        )
        return prep


class CreateVisitReportUseCase(BaseUseCase[Tuple[int, str, Optional[str], Any], VisitReport]):
    def execute(self, params: Tuple[int, str, Optional[str], Any]) -> VisitReport:
        prep_id, raw_transcript, audio_file_path, user = params
        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            raise VisitPreparationNotFoundException(prep_id)

        exec_summary = "Rendez-vous qualitatif. Le client confirme des lenteurs de réseau et souhaite s'équiper d'une offre Fibre Pro Orange B2B et d'outils collaboratifs."
        confirmed_needs = ["Fibre Optique Pro", "Microsoft 365 Pro & Teams"]
        objections = ["Coût mensuel"]
        actions = ["Envoyer devis de fibre", "Planifier démo Microsoft 365"]

        if raw_transcript:
            text_lower = raw_transcript.lower()
            if "sécurité" in text_lower or "virus" in text_lower or "pirat" in text_lower:
                confirmed_needs.append("Firewall Managé")
                actions.append("Faire chiffrer l'option Firewall")
            if "téléphone" in text_lower or "standard" in text_lower:
                confirmed_needs.append("Téléphonie Teams (VoIP)")
            if "hds" in text_lower or "médical" in text_lower:
                confirmed_needs.append("Hébergement de Données de Santé (HDS)")

        email_draft = (
            f"Bonjour,\n\nMerci pour le temps accordé lors de notre rencontre chez {prep.enterprise.name}. "
            f"Comme convenu, nous étudions vos éligibilités Fibre Orange B2B et vous transmettons nos préconisations.\n\nCordialement."
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

        log_demo_event(
            'REPORT_GENERATED',
            f"Rapport de visite commerciale généré pour: {report.preparation.enterprise.name}",
            user=user if (user and user.is_authenticated) else None,
            metadata={"report_id": report.id, "enterprise_name": report.preparation.enterprise.name}
        )

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

        # Trigger automated dispatching
        from kam.dispatch_engine import dispatch_dossier
        dispatch_dossier(dossier)

        recommended_services_data = []
        current_state = [report.executive_summary]
        proposed_state = ["Mise en place des solutions Orange Business B2B"]
        roadmap = ["Étape 1: Audit technique", "Étape 2: Raccordement Fibre Orange", "Étape 3: Déploiement Cloud"]

        for need_name in report.confirmed_needs:
            try:
                s = ServiceCatalog.objects.get(name=need_name)
                recommended_services_data.append({
                    "service_id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "priority": "HIGH",
                    "reasoning": s.description
                })
            except ServiceCatalog.DoesNotExist:
                pass

        twin, t_created = BusinessTwin.objects.get_or_create(
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
