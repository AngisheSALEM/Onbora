import os
from django.core.files.storage import FileSystemStorage
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Enterprise, VisitPreparation, VisitReport
from .serializers import EnterpriseSerializer, VisitPreparationSerializer, VisitReportSerializer
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from catalog.models import ServiceCatalog
from reporting.utils import log_demo_event
from accounts.permissions import IsSalespersonOrAdmin

class EnterpriseSearchView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            queryset = Enterprise.objects.all()
            serializer = EnterpriseSerializer(queryset, many=True)
            return Response(serializer.data)
            
        # 1. Search in CRM Kaabu (Inbound/Outbound real-time check)
        from sales.integrations.kaabu import KaabuClient
        from django.db.models import Q
        
        kaabu_results = []
        try:
            client = KaabuClient()
            kaabu_results = client.search_organizations(name=query)
        except Exception:
            # Resilient fallback if the API is offline
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
            
        # 3. Search locally for matching names or Kaabu IDs
        matched_ids = [item.get("id") for item in kaabu_results if item.get("id")]
        queryset = Enterprise.objects.filter(
            Q(name__icontains=query) | Q(kaabu_organization_id__in=matched_ids)
        )
        
        # 4. Fallback mock generation if not found in CRM or local database
        if not queryset.exists():
            self.create_mock_enterprise(query)
            queryset = Enterprise.objects.filter(name__icontains=query)
            
        serializer = EnterpriseSerializer(queryset, many=True)
        return Response(serializer.data)

    def create_mock_enterprise(self, name):
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


class VisitPreparationCreateView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        enterprise_id = request.data.get('enterprise')
        if not enterprise_id:
            return Response({"detail": "L'identifiant de l'entreprise est requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        prep = VisitPreparation.objects.create(
            enterprise=enterprise,
            salesperson=request.user,
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
        
        serializer = VisitPreparationSerializer(prep)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitReportCreateView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        prep_id = request.data.get('preparation')
        raw_transcript = request.data.get('raw_transcript', '').strip()
        audio_file_path = request.data.get('audio_file_path', '').strip()
        
        if not prep_id:
            return Response({"detail": "La préparation de visite est requise."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            return Response({"detail": "Préparation de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)

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
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id, "enterprise_name": report.preparation.enterprise.name}
        )
        
        serializer = VisitReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitReportTransmitView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        try:
            report = VisitReport.objects.get(pk=pk)
        except VisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
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
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id, "dossier_id": dossier.id}
        )
        
        return Response({
            "detail": "Rapport transmis au KAM avec succès.",
            "dossier_id": dossier.id
        }, status=status.HTTP_200_OK)


from onbora.exports import get_export_response

class VisitReportExportView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            report = VisitReport.objects.get(pk=pk)
        except VisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        log_demo_event(
            'PDF_EXPORTED',
            f"Rapport de visite exporté en PDF/HTML pour: {report.preparation.enterprise.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id}
        )
        
        use_pdf = request.GET.get('format', 'pdf') == 'pdf'
        doc_type = request.GET.get('type', 'visit')
        
        if use_pdf:
            from onbora.exports import generate_reportlab_pdf_response
            return generate_reportlab_pdf_response(doc_type, report)
        
        enterprise = report.preparation.enterprise
        title = f"Rapport de Visite - {enterprise.name}"
        
        needs_html = "".join([f'<span class="badge badge-success">{need}</span>' for need in (report.confirmed_needs or [])])
        objections_html = "".join([f'<span class="badge badge-danger">{obj}</span>' for obj in (report.objections_raised or [])])
        actions_html = "".join([f'<li>{act}</li>' for act in (report.actions_todo or [])])
        
        content_html = f"""
        <h2 class="document-title">RAPPORT DE VISITE COMMERCIALE</h2>
        
        <div class="section">
            <h3 class="section-title">Entreprise Ciblée</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Nom :</strong> {enterprise.name}</li>
                    <li><strong>Secteur :</strong> {enterprise.sector}</li>
                    <li><strong>Localisation :</strong> {enterprise.location}</li>
                    <li><strong>Taille :</strong> {enterprise.approximate_size}</li>
                    <li><strong>Site web :</strong> <a href="{enterprise.website}" target="_blank">{enterprise.website}</a></li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Résumé de la visite</h3>
            <div class="card">
                <p style="margin: 0; font-size: 13px; font-weight: 500;">{report.executive_summary}</p>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Insights de conversation</h3>
            <div class="grid">
                <div class="card">
                    <p class="card-title">Besoins Confirmés</p>
                    {needs_html if needs_html else '<p style="font-size: 12px; color: #64748b; margin: 0;">Aucun besoin spécifié</p>'}
                </div>
                <div class="card">
                    <p class="card-title">Objections Rencontrées</p>
                    {objections_html if objections_html else '<p style="font-size: 12px; color: #64748b; margin: 0;">Aucune objection</p>'}
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Plan d'actions</h3>
            <div class="card">
                <ul class="list-unstyled" style="padding-left: 20px; list-style-type: disc;">
                    {actions_html}
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Brouillon d'email de suivi</h3>
            <div class="email-preview">{report.follow_up_email_draft}</div>
        </div>
        """
        
        return get_export_response(f"rapport_visite_{pk}", title, content_html)


class VoiceUploadView(APIView):
    permission_classes = [IsSalespersonOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        prep_id = request.data.get('preparation_id')
        audio_file = request.FILES.get('audio')

        if not audio_file:
            return Response({"detail": "Aucun fichier audio fourni."}, status=status.HTTP_400_BAD_REQUEST)

        # File size limit validation: 10 MB max
        MAX_AUDIO_SIZE = 10 * 1024 * 1024
        if audio_file.size > MAX_AUDIO_SIZE:
            return Response(
                {"detail": "Le fichier audio est trop volumineux. La taille maximale autorisée est de 10 Mo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Retrieve the enterprise information if prep_id is provided
        enterprise_name = "le client"
        sector = "générique"
        if prep_id:
            try:
                prep = VisitPreparation.objects.get(pk=prep_id)
                enterprise_name = prep.enterprise.name
                sector = prep.enterprise.sector or "générique"
            except VisitPreparation.DoesNotExist:
                pass

        # Save audio file
        from django.conf import settings
        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'voice_uploads'), exist_ok=True)
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'voice_uploads'), base_url='/media/voice_uploads/')
        filename = fs.save(audio_file.name, audio_file)
        uploaded_file_url = fs.url(filename)
        full_audio_path = fs.path(filename)

        # Transcribe audio using OpenAI Whisper
        from .whisper_service import transcribe_audio_file
        whisper_res = transcribe_audio_file(full_audio_path)
        transcript = whisper_res.get("text") or (
            f"Discussion commerciale chez {enterprise_name} : "
            "Le prospect confirme le besoin de raccorder ses locaux en Fibre Optique Pro avec basculement 4G, "
            "de sécuriser son réseau par Firewall et de migrer sa messagerie vers Microsoft 365 Pro & Teams."
        )

        # Log demo event
        log_demo_event(
            'AUDIO_RECORDED',
            f"Fichier audio de visite téléversé et transcrit via Whisper ({whisper_res.get('provider', 'whisper')}) pour: {enterprise_name}",
            user=request.user,
            metadata={"filename": filename, "file_url": uploaded_file_url, "provider": whisper_res.get("provider")}
        )

        return Response({
            "detail": "Fichier audio téléversé et transcrit avec OpenAI Whisper.",
            "audio_file_path": uploaded_file_url,
            "transcript": transcript,
            "provider": whisper_res.get("provider", "whisper")
        }, status=status.HTTP_200_OK)


from .models import ScraperCredential
from .serializers import ScraperCredentialSerializer
from accounts.permissions import IsAdmin

class ScraperCredentialListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        creds = ScraperCredential.objects.all()
        serializer = ScraperCredentialSerializer(creds, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ScraperCredentialSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScraperCredentialDetailView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, platform):
        try:
            return ScraperCredential.objects.get(platform=platform.upper())
        except ScraperCredential.DoesNotExist:
            return None

    def get(self, request, platform):
        cred = self.get_object(platform)
        if not cred:
            return Response({"detail": "Identifiants introuvables pour cette plateforme."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ScraperCredentialSerializer(cred)
        return Response(serializer.data)

    def put(self, request, platform):
        cred = self.get_object(platform)
        if not cred:
            return Response({"detail": "Identifiants introuvables pour cette plateforme."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ScraperCredentialSerializer(cred, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, platform):
        cred = self.get_object(platform)
        if not cred:
            return Response({"detail": "Identifiants introuvables pour cette plateforme."}, status=status.HTTP_404_NOT_FOUND)
        cred.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class KaabuDeduplicateView(APIView):
    """
    RÉCUPÉRATION (GET/POST) : Interroge Kaabu CRM pour récupérer les données entreprise
    et effectuer une déduplication (SIREN 100%, Domaine 95%, Fuzzy Jaro-Winkler > 70%).
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        name = request.data.get("name", "").strip()
        siren = request.data.get("siren", "").strip()
        domain = request.data.get("domain", "").strip()

        from sales.integrations.kaabu import KaabuClient
        client = KaabuClient()
        matches = client.fetch_organization_data(name=name, siren=siren, domain=domain)
        
        return Response({
            "query": {"name": name, "siren": siren, "domain": domain},
            "total_matches": len(matches),
            "matches": matches
        }, status=status.HTTP_200_OK)


class ArrowSphereWebhookView(APIView):
    """
    RÉCEPTION PASSIVE (POST Webhook) : Reçoit les notifications d'activation d'ArrowSphere.
    Met à jour le statut du service local pour déverrouiller l'adoption client (HelpDrawer).
    """
    permission_classes = []  # Webhook public récepteur

    def post(self, request):
        from sales.integrations.arrowsphere import ArrowSphereClient
        client = ArrowSphereClient()
        parsed = client.parse_activation_webhook(request.data)

        if not parsed["valid"]:
            return Response({
                "error": "Payload invalide ou statut non-ACTIF",
                "raw": request.data
            }, status=status.HTTP_400_BAD_REQUEST)

        tenant_id = parsed["tenant_id"]
        activated_services = parsed["activated_services"]

        # Mise à jour locale du statut d'entreprise si trouvée
        enterprise = Enterprise.objects.filter(arrowsphere_tenant_id=tenant_id).first()
        if enterprise:
            enterprise.sync_status = "SYNCED"
            enterprise.save()

        return Response({
            "status": "SUCCESS",
            "message": f"Données d'activation reçues pour le tenant {tenant_id}",
            "tenant_id": tenant_id,
            "unlocked_services": activated_services
        }, status=status.HTTP_200_OK)


