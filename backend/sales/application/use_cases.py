import os
from typing import List, Dict, Any, Optional
from django.db.models import Q
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

        # 3. Search locally
        matched_ids = [item.get("id") for item in kaabu_results if item.get("id")]
        queryset = Enterprise.objects.filter(
            Q(name__icontains=query) | Q(kaabu_organization_id__in=matched_ids)
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

        if any(k in name_lower for k in ["médical", "clinique", "cabinet", "hôpital", "médecin", "docteur", "santé"]):
            sector = "Médical / Santé"
            location = "Kinshasa (Gombe)"
        elif any(k in name_lower for k in ["tech", "soft", "digital", "numérique", "mine", "cuivre"]):
            sector = "Technologie / Mines"
            location = "Lubumbashi"
            size = "100-499 employés"
        elif any(k in name_lower for k in ["store", "super", "boutique", "vente", "commerce"]):
            sector = "Commerce / Retail"
            location = "Brazzaville"
            size = "2-19 employés"

        return Enterprise.objects.create(
            name=name,
            website=website,
            sector=sector,
            approximate_size=size,
            location=location,
            existing_crm_data={"crm_status": "PROSPECT", "last_contact": "Jamais"}
        )


class CreateVisitPreparationUseCase(BaseUseCase[tuple[int, Any], VisitPreparation]):
    def execute(self, params: tuple[int, Any]) -> VisitPreparation:
        enterprise_id, user = params
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            raise EnterpriseNotFoundException(enterprise_id)

        prep = VisitPreparation.objects.create(
            enterprise=enterprise,
            salesperson=user,
            meeting_objective=f"Qualifier l'éligibilité réseau et les besoins de collaboration pour {enterprise.name}.",
            hypothesis_to_verify=(
                f"L'entreprise {enterprise.name} utilise actuellement des solutions grand public (ADSL/Box). "
                "Leur croissance récente nécessite une interconnexion réseau stable et des outils collaboratifs professionnels."
            ),
            custom_pitch=(
                f"Mettre en avant notre offre Fibre Optique Pro pour garantir un débit symétrique et stable, "
                "ainsi que Microsoft 365 pour structurer la collaboration interne."
            ),
            key_questions=(
                "1. Quelle est votre connexion internet principale actuelle ? Avez-vous des coupures ?\n"
                "2. Comment échangez-vous vos fichiers entre collègues ?\n"
                "3. Avez-vous un outil de visioconférence et de chat d'entreprise ?"
            )
        )
        return prep


class CreateVisitReportUseCase(BaseUseCase[tuple[int, str, Optional[str], Any], VisitReport]):
    def execute(self, params: tuple[int, str, Optional[str], Any]) -> VisitReport:
        prep_id, raw_transcript, audio_file_path, user = params
        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            raise VisitPreparationNotFoundException(prep_id)

        exec_summary = "Rendez-vous qualitatif. Le client confirme des lenteurs de réseau et souhaite s'équiper d'une fibre pro et d'outils collaboratifs."
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
            f"Comme convenu, nous étudions vos éligibilités Fibre et vous transmettons nos préconisations.\n\nCordialement."
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


class TransmitVisitReportUseCase(BaseUseCase[tuple[int, Any], int]):
    def execute(self, params: tuple[int, Any]) -> int:
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
        proposed_state = ["Mise en place des services managés Orange Business"]
        roadmap = ["Étape 1: Audit technique", "Étape 2: Raccordement Fibre", "Étape 3: Déploiement logiciel"]

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


class ProcessVoiceUploadUseCase(BaseUseCase[tuple[Any, Optional[int], Any], VoiceUploadResultDTO]):
    def execute(self, params: tuple[Any, Optional[int], Any]) -> VoiceUploadResultDTO:
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
            "Le prospect confirme le besoin de raccorder ses locaux en Fibre Optique Pro avec basculement 4G, "
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
