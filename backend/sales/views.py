import os
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Enterprise, VisitPreparation, VisitReport, ScraperCredential
from .serializers import EnterpriseSerializer, VisitPreparationSerializer, VisitReportSerializer, ScraperCredentialSerializer
from .application.use_cases import (
    SearchEnterprisesUseCase,
    CreateVisitPreparationUseCase,
    CreateVisitReportUseCase,
    TransmitVisitReportUseCase,
    ProcessVoiceUploadUseCase,
)
from .domain.exceptions import (
    EnterpriseNotFoundException,
    VisitPreparationNotFoundException,
    VisitReportNotFoundException,
)
from accounts.permissions import IsSalespersonOrAdmin, IsAdmin
from onbora.exports import get_export_response
from reporting.utils import log_demo_event


class EnterpriseSearchView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        enterprises = SearchEnterprisesUseCase().execute(query)
        serializer = EnterpriseSerializer(enterprises, many=True)
        return Response(serializer.data)


class VisitPreparationCreateView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        enterprise_id = request.data.get('enterprise')
        if not enterprise_id:
            return Response({"detail": "L'identifiant de l'entreprise est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            prep = CreateVisitPreparationUseCase().execute((enterprise_id, request.user))
            serializer = VisitPreparationSerializer(prep)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportCreateView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        prep_id = request.data.get('preparation')
        raw_transcript = request.data.get('raw_transcript', '').strip()
        audio_file_path = request.data.get('audio_file_path', '').strip()

        if not prep_id:
            return Response({"detail": "La préparation de visite est requise."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            report = CreateVisitReportUseCase().execute((prep_id, raw_transcript, audio_file_path, request.user))
            serializer = VisitReportSerializer(report)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except VisitPreparationNotFoundException:
            return Response({"detail": "Préparation de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportTransmitView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        try:
            dossier_id = TransmitVisitReportUseCase().execute((pk, request.user))
            return Response({
                "detail": "Rapport transmis au KAM avec succès.",
                "dossier_id": dossier_id
            }, status=status.HTTP_200_OK)
        except VisitReportNotFoundException:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)


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

        MAX_AUDIO_SIZE = 10 * 1024 * 1024
        if audio_file.size > MAX_AUDIO_SIZE:
            return Response(
                {"detail": "Le fichier audio est trop volumineux. La taille maximale autorisée est de 10 Mo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = ProcessVoiceUploadUseCase().execute((audio_file, prep_id, request.user))
        return Response({
            "detail": "Fichier audio téléversé et transcrit avec OpenAI Whisper.",
            "audio_file_path": result.audio_file_path,
            "transcript": result.transcript,
            "provider": result.provider
        }, status=status.HTTP_200_OK)


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
    permission_classes = []

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
