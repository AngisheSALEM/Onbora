import os
from django.db import models
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from accounts.models import User
from .models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession, ScraperCredential
from .serializers import (
    PlaqueSerializer,
    PlaqueDetailSerializer,
    EnterpriseSerializer,
    EnterpriseMapSerializer,
    EnterpriseBriefSerializer,
    SalespersonActivitySerializer,
    SalespersonUserSerializer,
    LiveVisitSessionSerializer,
    LiveCopilotTurnSerializer,
    VisitPreparationSerializer,
    VisitReportSerializer,
    CoreAIFeedbackSerializer,
    ScraperCredentialSerializer,
)
from .application.use_cases import (
    ListPlaquesUseCase,
    GetPlaqueDetailUseCase,
    ScrapeAndEnrichEnterpriseUseCase,
    ProcessLiveCopilotTurnUseCase,
    GenerateVisitReportWithAIUseCase,
    SubmitCoreAIFeedbackUseCase,
    SearchEnterprisesUseCase,
    GetEnterprisesForMapUseCase,
    GetEnterpriseBriefUseCase,
    GetSalespersonActivityUseCase,
    CreateVisitPreparationUseCase,
    CreateVisitReportUseCase,
    TransmitVisitReportUseCase,
    ProcessVoiceUploadUseCase,
)
from .domain.exceptions import (
    PlaqueNotFoundException,
    EnterpriseNotFoundException,
    VisitPreparationNotFoundException,
    LiveVisitSessionNotFoundException,
    VisitReportNotFoundException,
)
from accounts.permissions import IsSalespersonOrAdmin, IsAdmin
from onbora.exports import get_export_response
from reporting.utils import log_demo_event


class PlaqueListCreateView(APIView):
    """
    GET: Liste toutes les plaques territoriales actives avec le nombre de leads et commerciaux assignés.
    POST: Crée une nouvelle plaque de prospection territoriale.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        use_case = ListPlaquesUseCase()
        plaques_dto = use_case.execute()
        serializer = PlaqueSerializer(plaques_dto, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PlaqueSerializer(data=request.data)
        if serializer.is_valid():
            plaque = serializer.save()
            return Response(PlaqueSerializer(plaque).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PlaqueDetailView(APIView):
    """
    GET: Détail d'une plaque avec la liste complète de ses entreprises / leads qualifiés.
    PATCH: Modifie la plaque ou assigne des commerciaux.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request, pk):
        try:
            plaque_obj = Plaque.objects.prefetch_related('enterprises', 'assigned_salespersons').get(pk=pk)
            serializer = PlaqueDetailSerializer(plaque_obj)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Plaque.DoesNotExist:
            return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            plaque_obj = Plaque.objects.get(pk=pk)
        except Plaque.DoesNotExist:
            return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)

            serializer = PlaqueSerializer(plaque_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalespersonListView(APIView):
    """
    GET: Liste tous les commerciaux avec leur statut et plaques affectées.
    POST: Création administrative d'un compte commercial par le superviseur.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        from accounts.models import User
        salespersons = User.objects.filter(role=User.SALESPERSON).prefetch_related('assigned_plaques')
        serializer = SalespersonUserSerializer(salespersons, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        from accounts.models import User
        from rest_framework.authtoken.models import Token
        username = request.data.get('username', '').strip().lower()
        password = request.data.get('password', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = request.data.get('phone', '').strip()
        location = request.data.get('location', 'Kinshasa').strip()
        initial_plaque_id = request.data.get('plaque_id')

        if not username or not password:
            return Response(
                {"detail": "Le nom d'utilisateur et le mot de passe sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"detail": f"Le nom d'utilisateur '{username}' est déjà utilisé."},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = f"{username}@onbora.cg"
        # Check if email is already taken
        if User.objects.filter(email__iexact=email).exists():
            email = f"{username}_{User.objects.count()}@onbora.cg"

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=User.SALESPERSON,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            location=location,
            is_available=True,
            is_active=True
        )
        Token.objects.get_or_create(user=user)

        if initial_plaque_id:
            try:
                plaque = Plaque.objects.get(pk=initial_plaque_id)
                plaque.assigned_salespersons.add(user)
            except Plaque.DoesNotExist:
                pass

        log_demo_event(
            'SALESPERSON_CREATED',
            f"Création du compte commercial '{user.username}' ({user.first_name} {user.last_name}) par le superviseur",
            user=request.user if request.user.is_authenticated else None,
            metadata={"salesperson_id": user.id, "username": user.username}
        )

        return Response(
            SalespersonUserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


class SalespersonDetailView(APIView):
    """
    DELETE: Révoque et supprime un compte commercial (interdiction d'accès immédiate à l'application mobile).
    PATCH: Met à jour les informations ou le mot de passe du commercial.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def delete(self, request, pk):
        from accounts.models import User
        from rest_framework.authtoken.models import Token
        try:
            user = User.objects.get(pk=pk, role=User.SALESPERSON)
        except User.DoesNotExist:
            return Response({"detail": "Commercial introuvable."}, status=status.HTTP_404_NOT_FOUND)

        username = user.username
        full_name = f"{user.first_name} {user.last_name}".strip()

        # Invalidate any active auth tokens immediately
        Token.objects.filter(user=user).delete()
        user.is_active = False
        user.delete()

        log_demo_event(
            'SALESPERSON_REMOVED',
            f"Révocation et suppression du commercial '{username}' ({full_name}) par le superviseur",
            user=request.user if request.user.is_authenticated else None,
            metadata={"deleted_salesperson_id": pk, "username": username}
        )

        return Response(
            {"message": f"Le compte commercial '{username}' a été révoqué et supprimé avec succès."},
            status=status.HTTP_200_OK
        )

    def patch(self, request, pk):
        from accounts.models import User
        try:
            user = User.objects.get(pk=pk, role=User.SALESPERSON)
        except User.DoesNotExist:
            return Response({"detail": "Commercial introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'phone' in request.data:
            user.phone = request.data['phone']
        if 'location' in request.data:
            user.location = request.data['location']
        if 'is_available' in request.data:
            user.is_available = bool(request.data['is_available'])
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])

        user.save()
        return Response(SalespersonUserSerializer(user).data, status=status.HTTP_200_OK)


class AssignSalespersonsToPlaqueView(APIView):
    """
    POST: Assigne une liste de commerciaux à une plaque donnée.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        from accounts.models import User
        try:
            plaque = Plaque.objects.get(pk=pk)
        except Plaque.DoesNotExist:
            return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)

        salesperson_ids = request.data.get('salesperson_ids', [])
        salespersons = User.objects.filter(id__in=salesperson_ids, role=User.SALESPERSON)
        plaque.assigned_salespersons.set(salespersons)
        plaque.save()

        log_demo_event(
            'SALESPERSON_ASSIGNED_PLAQUE',
            f"{len(salespersons)} commercial(aux) assigné(s) à la plaque {plaque.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"plaque_id": plaque.id, "salesperson_ids": salesperson_ids}
        )

        return Response({
            "message": f"Commerciaux affectés à la plaque {plaque.code} avec succès.",
            "plaque": PlaqueDetailSerializer(plaque).data
        }, status=status.HTTP_200_OK)


class SupervisorDashboardView(APIView):
    """
    GET: Fournit une vue agrégée en temps réel pour la console superviseur/admin:
    - Plaques & découpage territorial
    - Leads géolocalisés (Convertis en Vert, À convertir en Orange)
    - Déploiement des commerciaux
    - Flux temps réel des comptes-rendus de visite reçus depuis le mobile
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        from accounts.models import User

        # 1. Plaques
        plaques = ListPlaquesUseCase().execute()
        plaques_data = PlaqueSerializer(plaques, many=True).data

        # 2. Leads géolocalisés
        enterprises = Enterprise.objects.all().order_by('-created_at')
        enterprises_data = EnterpriseSerializer(enterprises, many=True).data

        # 3. Commerciaux
        salespersons = User.objects.filter(role=User.SALESPERSON).prefetch_related('assigned_plaques')
        salespersons_data = SalespersonUserSerializer(salespersons, many=True).data

        # 4. Comptes-rendus de visite reçus
        reports = VisitReport.objects.select_related('preparation__enterprise', 'preparation__salesperson').order_by('-created_at')[:25]
        reports_feed = []
        for r in reports:
            salesperson_name = "Commercial Terrain"
            ent_name = "Entreprise"
            if hasattr(r, 'preparation') and r.preparation:
                if r.preparation.salesperson:
                    salesperson_name = f"{r.preparation.salesperson.first_name} {r.preparation.salesperson.last_name}".strip() or r.preparation.salesperson.username
                if r.preparation.enterprise:
                    ent_name = r.preparation.enterprise.name

            reports_feed.append({
                "id": r.id,
                "enterprise_name": ent_name,
                "salesperson_name": salesperson_name,
                "executive_summary": r.executive_summary,
                "confirmed_needs": r.confirmed_needs,
                "objections_raised": r.objections_raised,
                "actions_todo": r.actions_todo,
                "ai_feedback_rating": r.ai_feedback_rating,
                "ai_feedback_comments": r.ai_feedback_comments,
                "created_at": r.created_at.isoformat() if hasattr(r.created_at, 'isoformat') else str(r.created_at),
            })

        return Response({
            "total_plaques": len(plaques_data),
            "total_enterprises": enterprises.count(),
            "ready_enterprises_count": enterprises.filter(is_ready_for_conversion=True).count(),
            "total_salespersons": salespersons.count(),
            "total_reports": VisitReport.objects.count(),
            "plaques": plaques_data,
            "enterprises": enterprises_data,
            "salespersons": salespersons_data,
            "recent_reports_feed": reports_feed
        }, status=status.HTTP_200_OK)


class EnterpriseEnrichView(APIView):
    """
    POST: Déclenche le pipeline de Scraping Web & Social + Génération d'Hypothèses IA pré-visite.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        try:
            use_case = ScrapeAndEnrichEnterpriseUseCase()
            enriched_dto = use_case.execute((pk, request.user))
            return Response({
                "message": "Entreprise scrapée et enrichie d'hypothèses commerciales avec succès.",
                "enterprise": EnterpriseSerializer(Enterprise.objects.get(pk=pk)).data
            }, status=status.HTTP_200_OK)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)


class LiveCopilotTurnView(APIView):
    """
    POST: Endpoint temps réel pour le copilote en direct pendant la visite.
    Reçoit le fragment vocal ou textuel transcrit par Whisper -> Core AI -> retourne le JSON de proposition dynamique.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        enterprise_id = request.data.get('enterprise_id')
        transcript_chunk = request.data.get('transcript_chunk', '').strip()

        if not enterprise_id:
            return Response({"detail": "L'identifiant de l'entreprise est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            use_case = ProcessLiveCopilotTurnUseCase()
            turn_dto = use_case.execute((enterprise_id, transcript_chunk, request.user))
            serializer = LiveCopilotTurnSerializer(turn_dto)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportGenerateFromAIView(APIView):
    """
    POST: Génère le compte-rendu exécutif de visite via Core AI et transmet le dossier au backoffice KAM.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        preparation_id = request.data.get('preparation_id')
        transcript = request.data.get('transcript', '').strip()

        if not preparation_id:
            return Response({"detail": "L'identifiant de la fiche de préparation est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            use_case = GenerateVisitReportWithAIUseCase()
            result_dto = use_case.execute((preparation_id, transcript, request.user))
            return Response({
                "message": "Rapport de visite généré par Core AI et transmis au KAM avec succès.",
                "report_id": result_dto.report_id,
                "dossier_id": result_dto.dossier_id,
                "enterprise_name": result_dto.enterprise_name,
                "executive_summary": result_dto.executive_summary,
                "confirmed_needs": result_dto.confirmed_needs,
                "objections_raised": result_dto.objections_raised,
                "actions_todo": result_dto.actions_todo,
                "follow_up_email_draft": result_dto.follow_up_email_draft,
            }, status=status.HTTP_201_CREATED)
        except VisitPreparationNotFoundException:
            return Response({"detail": "Fiche de préparation introuvable."}, status=status.HTTP_404_NOT_FOUND)


class VisitReportFeedbackView(APIView):
    """
    POST: Envoie une évaluation humaine (note, remarques) à Core AI pour l'amélioration continue du modèle.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        serializer = CoreAIFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        rating = serializer.validated_data['rating']
        comments = serializer.validated_data.get('comments', '')

        try:
            use_case = SubmitCoreAIFeedbackUseCase()
            feedback_dto = use_case.execute((pk, rating, comments, request.user))
            return Response({
                "message": "Feedback d'évaluation envoyé au Core AI pour entraînement continu.",
                "report_id": feedback_dto.report_id,
                "rating": feedback_dto.rating,
                "status": feedback_dto.status,
                "submitted_at": feedback_dto.submitted_at
            }, status=status.HTTP_200_OK)
        except VisitReportNotFoundException:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)


class EnterpriseSearchView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        enterprises = SearchEnterprisesUseCase().execute(query)
        serializer = EnterpriseSerializer(enterprises, many=True)
        return Response(serializer.data)


class EnterpriseMapView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        plaque = request.query_params.get('plaque')
        ready_only = request.query_params.get('ready_only', 'false').lower() == 'true'
        search_query = request.query_params.get('q')

        enterprises = GetEnterprisesForMapUseCase().execute((plaque, ready_only, search_query))
        
        if request.query_params.get('format') == 'geojson':
            features = [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [e.longitude, e.latitude]
                    },
                    "properties": {
                        "id": e.id,
                        "name": e.name,
                        "sector": e.sector,
                        "approximate_size": e.approximate_size,
                        "location": e.location,
                        "plaque": e.plaque,
                        "is_ready_for_conversion": e.is_ready_for_conversion,
                        "conversion_score": e.conversion_score,
                        "recommended_solution": e.recommended_solution,
                        "existing_crm_status": e.existing_crm_status,
                    }
                }
                for e in enterprises
            ]
            return Response({
                "type": "FeatureCollection",
                "features": features
            }, status=status.HTTP_200_OK)

        serializer = EnterpriseMapSerializer(enterprises, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EnterpriseBriefView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request, pk):
        try:
            brief = GetEnterpriseBriefUseCase().execute((pk, request.user))
            serializer = EnterpriseBriefSerializer(brief)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)


class PlaqueListView(APIView):
    """Alias pour la liste des plaques vers MapLibre"""
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        use_case = ListPlaquesUseCase()
        plaques_dto = use_case.execute()
        serializer = PlaqueSerializer(plaques_dto, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SalespersonActivityView(APIView):
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
                    <li><strong>Commercial :</strong> {report.preparation.salesperson.first_name if report.preparation.salesperson else 'N/A'} {report.preparation.salesperson.last_name if report.preparation.salesperson else ''}</li>
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


# ============================================================================
# FIELD INTELLIGENCE & LEADERBOARD VIEWS
# ============================================================================

from .models import FieldIntelligenceReport, NearbyLead, ReferralLead, TradeAudit, SalesIncentivePoint
from .serializers import (
    FieldIntelligenceReportSerializer,
    NearbyLeadSerializer,
    ReferralLeadSerializer,
    TradeAuditSerializer,
    SalesIncentivePointSerializer,
    LeaderboardEntrySerializer
)


class FieldIntelligenceReportCreateListView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        reports = FieldIntelligenceReport.objects.all().order_by('-created_at')
        enterprise_id = request.GET.get('enterprise_id')
        if enterprise_id:
            reports = reports.filter(enterprise_id=enterprise_id)
        
        conversion_status = request.GET.get('conversion_status')
        if conversion_status:
            reports = reports.filter(conversion_status=conversion_status)

        serializer = FieldIntelligenceReportSerializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        enterprise_id = data.get('enterprise_id') or data.get('enterprise')
        if not enterprise_id:
            return Response({"detail": "Le champ enterprise_id est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        visit_report_id = data.get('visit_report_id') or data.get('visit_report')
        visit_report = None
        if visit_report_id:
            visit_report = VisitReport.objects.filter(pk=visit_report_id).first()

        conversion_status = data.get('conversion_status', 'SUCCESS')
        rccm_number = data.get('rccm_number', '')
        nurturing_reason = data.get('nurturing_reason', 'NONE')
        contract_expiry_date = data.get('contract_expiry_date') or None
        scheduled_follow_up = data.get('scheduled_follow_up') or None
        nurturing_notes = data.get('nurturing_notes', '')

        # 1. Create Main Field Intelligence Report
        report = FieldIntelligenceReport.objects.create(
            visit_report=visit_report,
            enterprise=enterprise,
            salesperson=request.user,
            conversion_status=conversion_status,
            rccm_number=rccm_number,
            nurturing_reason=nurturing_reason,
            contract_expiry_date=contract_expiry_date,
            scheduled_follow_up=scheduled_follow_up,
            nurturing_notes=nurturing_notes,
            points_earned=0
        )

        total_points = 0

        # Points on conversion
        if conversion_status == 'SUCCESS':
            total_points += 100
            SalesIncentivePoint.objects.create(
                salesperson=request.user,
                field_report=report,
                action_type='PRE_CONVERSION',
                points=100,
                description=f"Pré-conversion réussie de {enterprise.name} (RCCM: {rccm_number})"
            )

        # 2. Process Nearby Leads (Lookalike 100m)
        nearby_leads_data = data.get('nearby_leads', [])
        for item in nearby_leads_data:
            if item.get('name'):
                lead = NearbyLead.objects.create(
                    field_report=report,
                    source_enterprise=enterprise,
                    name=item.get('name'),
                    sector=item.get('sector', 'Commerce / PME'),
                    manager_name=item.get('manager_name', ''),
                    phone=item.get('phone', ''),
                    proximity_notes=item.get('proximity_notes', ''),
                    photo_url=item.get('photo_url', ''),
                    latitude=item.get('latitude', enterprise.latitude),
                    longitude=item.get('longitude', enterprise.longitude),
                    status='NEW'
                )
                total_points += 25
                SalesIncentivePoint.objects.create(
                    salesperson=request.user,
                    field_report=report,
                    action_type='NEARBY_LEAD',
                    points=25,
                    description=f"Lead voisin 100m identifié: {lead.name}"
                )

        # 3. Process Referral Leads (Supply-Chain)
        referrals_data = data.get('referrals', [])
        for item in referrals_data:
            if item.get('company_name'):
                ref = ReferralLead.objects.create(
                    field_report=report,
                    source_enterprise=enterprise,
                    referral_type=item.get('referral_type', 'SUPPLIER'),
                    company_name=item.get('company_name'),
                    contact_person=item.get('contact_person', ''),
                    phone=item.get('phone', ''),
                    notes=item.get('notes', ''),
                    status='NEW'
                )
                total_points += 15
                SalesIncentivePoint.objects.create(
                    salesperson=request.user,
                    field_report=report,
                    action_type='REFERRAL',
                    points=15,
                    description=f"Parrainage collecté: {ref.company_name} ({ref.get_referral_type_display()})"
                )

        # 4. Process Trade Audit (Competitor Intelligence)
        trade_audits_data = data.get('trade_audits', [])
        for item in trade_audits_data:
            if item.get('competitor_name'):
                audit = TradeAudit.objects.create(
                    field_report=report,
                    enterprise=enterprise,
                    competitor_name=item.get('competitor_name'),
                    satisfaction_score=int(item.get('satisfaction_score', 3)),
                    friction_reasons=item.get('friction_reasons', []),
                    monthly_spend_estimated=item.get('monthly_spend_estimated') or None,
                    alert_notes=item.get('alert_notes', '')
                )
                total_points += 10
                SalesIncentivePoint.objects.create(
                    salesperson=request.user,
                    field_report=report,
                    action_type='TRADE_AUDIT',
                    points=10,
                    description=f"Audit concurrentiel {audit.competitor_name} ({audit.satisfaction_score}/5)"
                )

        report.points_earned = total_points
        report.save(update_fields=['points_earned'])

        log_demo_event(
            'FIELD_INTELLIGENCE_SUBMITTED',
            f"Rapport Field Intelligence #{report.id} ({total_points} pts gagnés) pour {enterprise.name}",
            user=request.user,
            metadata={
                "report_id": report.id,
                "points_earned": total_points,
                "nearby_count": len(nearby_leads_data),
                "referrals_count": len(referrals_data)
            }
        )

        serializer = FieldIntelligenceReportSerializer(report)
        return Response({
            "message": f"Rapport Field Intelligence enregistré avec succès ! Vous avez gagné +{total_points} points !",
            "points_earned": total_points,
            "report": serializer.data
        }, status=status.HTTP_201_CREATED)


class FieldIntelligenceNearbyLeadsView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        leads = NearbyLead.objects.all().order_by('-created_at')
        status_filter = request.GET.get('status')
        if status_filter:
            leads = leads.filter(status=status_filter)
        
        serializer = NearbyLeadSerializer(leads, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FieldIntelligenceTradeAuditsView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        audits = TradeAudit.objects.all().order_by('-created_at')
        priority_only = request.GET.get('priority') == 'true'
        if priority_only:
            audits = audits.filter(is_priority_friction_alert=True)
            
        serializer = TradeAuditSerializer(audits, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FieldIntelligenceLeaderboardView(APIView):
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        salespeople = User.objects.filter(role=User.SALESPERSON)
        leaderboard = []

        for sp in salespeople:
            points = SalesIncentivePoint.objects.filter(salesperson=sp)
            total_points = points.aggregate(models.Sum('points'))['points__sum'] or 0
            
            conversions_count = points.filter(action_type='PRE_CONVERSION').count()
            nearby_count = points.filter(action_type='NEARBY_LEAD').count()
            referrals_count = points.filter(action_type='REFERRAL').count()
            trade_count = points.filter(action_type='TRADE_AUDIT').count()

            leaderboard.append({
                "salesperson_id": sp.id,
                "salesperson_name": sp.username,
                "full_name": f"{sp.first_name} {sp.last_name}".strip() or sp.username,
                "total_points": total_points,
                "successful_conversions_count": conversions_count,
                "nearby_leads_count": nearby_count,
                "referrals_count": referrals_count,
                "trade_audits_count": trade_count,
                "rank": 0
            })

        # Sort descending by total points
        leaderboard.sort(key=lambda x: x['total_points'], reverse=True)
        for idx, entry in enumerate(leaderboard):
            entry['rank'] = idx + 1

        serializer = LeaderboardEntrySerializer(leaderboard, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

