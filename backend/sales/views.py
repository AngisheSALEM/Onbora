import os
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Enterprise, VisitPreparation, VisitReport, ScraperCredential
from .serializers import (
    EnterpriseSerializer,
    EnterpriseMapSerializer,
    EnterpriseBriefSerializer,
    PlaqueSerializer,
    SalespersonActivitySerializer,
    VisitPreparationSerializer,
    VisitReportSerializer,
    ScraperCredentialSerializer,
)
from .application.use_cases import (
    SearchEnterprisesUseCase,
    GetEnterprisesForMapUseCase,
    GetEnterpriseBriefUseCase,
    ListPlaquesUseCase,
    GetSalespersonActivityUseCase,
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


class EnterpriseMapView(APIView):
    """
    OpenStreetMap API endpoint returning geocoded enterprises.
    Supports filtering by plaque (territory), conversion readiness, and free text search.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        plaque = request.query_params.get('plaque')
        ready_only = request.query_params.get('ready_only', 'false').lower() == 'true'
        search_query = request.query_params.get('q')

        enterprises = GetEnterprisesForMapUseCase().execute((plaque, ready_only, search_query))
        serializer = EnterpriseMapSerializer(enterprises, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EnterpriseBriefView(APIView):
    """
    Returns or auto-generates the AI Brief for a given enterprise on the map.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request, pk):
        try:
            brief = GetEnterpriseBriefUseCase().execute((pk, request.user))
            serializer = EnterpriseBriefSerializer(brief)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)


class PlaqueListView(APIView):
    """
    Returns the list of territorial plaques/zones with ready prospects count and map centers.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        plaques = ListPlaquesUseCase().execute()
        serializer = PlaqueSerializer(plaques, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SalespersonActivityView(APIView):
    """
    Returns active meetings and past AI visit reports for the connected salesperson (Profile screen).
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        activity = GetSalespersonActivityUseCase().execute(request.user)
        serializer = SalespersonActivitySerializer(activity)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
            return Response({"detail": "L'identifiant de la fiche de préparation est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            report = CreateVisitReportUseCase().execute((prep_id, raw_transcript, audio_file_path, request.user))
            serializer = VisitReportSerializer(report)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except VisitPreparationNotFoundException:
            return Response({"detail": "Fiche de préparation introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportTransmitView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        try:
            dossier_id = TransmitVisitReportUseCase().execute((pk, request.user))
            return Response({
                "detail": "Rapport transmis au Key Account Manager (KAM) avec succès.",
                "dossier_id": dossier_id
            }, status=status.HTTP_200_OK)
        except VisitReportNotFoundException:
            return Response({"detail": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportExportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            report = VisitReport.objects.get(pk=pk)
        except VisitReport.DoesNotExist:
            return Response({"detail": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

        log_demo_event(
            'PDF_EXPORTED',
            f"Rapport de visite #{report.id} exporté en PDF/HTML",
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id}
        )

        use_pdf = request.GET.get('format', 'pdf') == 'pdf'
        doc_type = request.GET.get('type', 'report')

        if use_pdf:
            from onbora.exports import generate_reportlab_pdf_response
            return generate_reportlab_pdf_response(doc_type, report)

        title = f"Rapport de Visite Commerciale - {report.preparation.enterprise.name}"
        
        needs_html = "".join([f'<span class="badge badge-success">{need}</span>' for need in report.confirmed_needs])
        objections_html = "".join([f'<span class="badge badge-danger">{obj}</span>' for obj in report.objections_raised])
        
        actions_items = "".join([f"<li>👉 {action}</li>" for action in report.actions_todo])

        content_html = f"""
        <h2 class="document-title">COMPTE-RENDU DE VISITE TERRAIN</h2>
        
        <div class="section">
            <h3 class="section-title">Informations Générales</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Entreprise visitée :</strong> {report.preparation.enterprise.name}</li>
                    <li><strong>Commercial :</strong> {report.preparation.salesperson.first_name} {report.preparation.salesperson.last_name}</li>
                    <li><strong>Plaque territoriale :</strong> {report.preparation.enterprise.plaque}</li>
                    <li><strong>Date de la visite :</strong> {report.created_at.strftime('%d/%m/%Y %H:%M')}</li>
                    <li><strong>Objectif initial :</strong> {report.preparation.meeting_objective}</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Synthèse Commerciale</h3>
            <div class="card">
                <p style="margin: 0; font-size: 13px; line-height: 1.6;">{report.executive_summary}</p>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Besoins & Objections</h3>
            <div class="grid">
                <div class="card">
                    <p class="card-title">Besoins Confirmés (Orange B2B)</p>
                    {needs_html if needs_html else '<span style="color:#94a3b8; font-size:12px;">Aucun besoin identifié</span>'}
                </div>
                <div class="card">
                    <p class="card-title">Objections & Freins</p>
                    {objections_html if objections_html else '<span style="color:#94a3b8; font-size:12px;">Aucune objection formulée</span>'}
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Prochaines Actions à Mener</h3>
            <div class="card">
                <ul class="list-unstyled">
                    {actions_items if actions_items else '<li>Aucune action spécifique.</li>'}
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Proposition de Mail de Relance</h3>
            <div class="card" style="background-color: #f8fafc; border-color: #cbd5e1;">
                <p style="margin: 0; font-size: 12px; white-space: pre-wrap; font-family: monospace;">{report.follow_up_email_draft}</p>
            </div>
        </div>
        """

        return get_export_response(f"rapport_visite_{pk}", title, content_html)


class VoiceUploadView(APIView):
    permission_classes = [IsSalespersonOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        prep_id = request.data.get('preparation_id')

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
