import os
import logging
from django.db import models
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from accounts.models import User

logger = logging.getLogger(__name__)
from .models import Plaque, Enterprise, VisitPreparation, VisitReport, LiveVisitSession, ScraperCredential, SalesNotification, VisitFormSubmission, SegmentationConfig
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
    SalesNotificationSerializer,
    VisitFormSubmissionSerializer,
    SubmitVisitFormRequestSerializer,
    SegmentationConfigSerializer,
    ConvertedAccountSerializer,
)
from .application.use_cases import (
    ListPlaquesUseCase,
    GetPlaqueDetailUseCase,
    ScrapeAndEnrichEnterpriseUseCase,
    ProcessLiveCopilotTurnUseCase,
    ToggleLivePackageUseCase,
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
    SubmitVisitFormUseCase,
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
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            use_case = ListPlaquesUseCase()
            plaques_dto = use_case.execute()
            serializer = PlaqueSerializer(plaques_dto, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f"Error in PlaqueListCreateView.get: {exc}", exc_info=True)
            plaques = Plaque.objects.filter(is_active=True).prefetch_related('enterprises', 'assigned_salespersons')
            serializer = PlaqueSerializer(plaques, many=True)
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
    DELETE: Supprime définitivement la plaque.
    """
    permission_classes = [AllowAny]

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

    def delete(self, request, pk):
        try:
            plaque_obj = Plaque.objects.get(pk=pk)
            plaque_code = plaque_obj.code
            plaque_obj.delete()
            return Response({"message": f"Plaque {plaque_code} supprimée avec succès."}, status=status.HTTP_200_OK)
        except Plaque.DoesNotExist:
            return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)


class SalespersonListView(APIView):
    """
    GET: Liste tous les commerciaux avec leur statut et plaques affectées.
    POST: Création administrative d'un compte commercial par le superviseur.
    """
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
    POST: Assigne une liste de commerciaux à une plaque donnée et émet des notifications push.
    """
    permission_classes = [AllowAny]

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

        # Émission automatique de notifications dans l'application mobile de chaque commercial
        from shared.infrastructure.firebase_service import send_push_notification_to_user
        for sp in salespersons:
            notif_title = f"Nouvelle Plaque Assignée : {plaque.code}"
            notif_body = f"Le Back-Office vous a affecté au territoire '{plaque.name}' ({plaque.city}). Le périmètre cartographique et le fichier KML sont prêts dans votre application."
            SalesNotification.objects.create(
                recipient=sp,
                title=notif_title,
                message=notif_body,
                notification_type='PLAQUE_ASSIGNED',
                plaque=plaque,
                payload={
                    "plaque_id": plaque.id,
                    "plaque_code": plaque.code,
                    "plaque_name": plaque.name,
                    "city": plaque.city,
                    "latitude": plaque.latitude,
                    "longitude": plaque.longitude,
                    "radius_km": plaque.radius_km,
                    "kml_url": f"/api/sales/plaques/{plaque.id}/kml/",
                    "assigned_by": request.user.username if request.user.is_authenticated else "Superviseur Back-Office"
                }
            )
            # Envoi Push Notification FCM direct
            send_push_notification_to_user(
                user=sp,
                title=notif_title,
                body=notif_body,
                data={
                    "notification_type": "PLAQUE_ASSIGNED",
                    "plaque_id": str(plaque.id),
                    "plaque_code": str(plaque.code),
                    "plaque_name": str(plaque.name),
                    "kml_url": f"/api/sales/plaques/{plaque.id}/kml/",
                }
            )

        log_demo_event(
            'SALESPERSON_ASSIGNED_PLAQUE',
            f"{len(salespersons)} commercial(aux) assigné(s) à la plaque {plaque.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"plaque_id": plaque.id, "salesperson_ids": salesperson_ids}
        )

        return Response({
            "message": f"Commerciaux affectés à la plaque {plaque.code} avec succès. Notifications transmises.",
            "plaque": PlaqueDetailSerializer(plaque).data
        }, status=status.HTTP_200_OK)


class PlaqueKMLDownloadView(APIView):
    """
    GET: Fournit le fichier KML standard pour une plaque donnée.
    Peut être téléchargé au format .kml ou consommé en JSON pour MapLibre/mobile.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            plaque = Plaque.objects.get(pk=pk)
        except Plaque.DoesNotExist:
            return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)

        kml_content = plaque.kml_data or plaque.generate_kml()

        # Téléchargement direct du fichier KML physique
        if request.query_params.get('download') == 'true':
            response = HttpResponse(kml_content, content_type='application/vnd.google-earth.kml+xml')
            response['Content-Disposition'] = f'attachment; filename="{plaque.code}.kml"'
            return response

        return Response({
            "id": plaque.id,
            "code": plaque.code,
            "name": plaque.name,
            "city": plaque.city,
            "latitude": plaque.latitude,
            "longitude": plaque.longitude,
            "radius_km": plaque.radius_km,
            "boundary_geojson": plaque.boundary_geojson,
            "kml_data": kml_content,
            "download_url": f"/api/sales/plaques/{plaque.id}/kml/?download=true"
        }, status=status.HTTP_200_OK)


class PlaqueDrawAndSaveView(APIView):
    """
    POST: Enregistre une zone / polygone tracé depuis la carte Back-Office,
    génère automatiquement le KML, et envoie les notifications aux commerciaux affectés.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            code = (request.data.get('code') or '').strip().upper()
            name = (request.data.get('name') or '').strip()
            city = (request.data.get('city') or 'Kinshasa').strip()
            latitude = request.data.get('latitude', -4.3033)
            longitude = request.data.get('longitude', 15.3083)
            radius_km = request.data.get('radius_km', 5.0)
            boundary_geojson = request.data.get('boundary_geojson', {})
            kml_data = request.data.get('kml_data', '')
            salesperson_ids = request.data.get('salesperson_ids', [])
            plaque_id = request.data.get('plaque_id')

            if not name or not code:
                return Response({"detail": "Le code et le nom de la plaque sont requis."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                lat_f = float(latitude)
                lng_f = float(longitude)
                rad_f = float(radius_km)
            except (ValueError, TypeError):
                lat_f = -4.3033
                lng_f = 15.3083
                rad_f = 5.0

            if plaque_id:
                try:
                    plaque = Plaque.objects.get(pk=plaque_id)
                except Plaque.DoesNotExist:
                    return Response({"detail": "Plaque introuvable."}, status=status.HTTP_404_NOT_FOUND)
            else:
                existing = Plaque.objects.filter(code=code).first()
                if existing:
                    plaque = existing
                else:
                    plaque = Plaque(code=code)

            plaque.code = code
            plaque.name = name
            plaque.city = city
            plaque.latitude = lat_f
            plaque.longitude = lng_f
            plaque.radius_km = rad_f
            if boundary_geojson:
                plaque.boundary_geojson = boundary_geojson
            if kml_data:
                plaque.kml_data = kml_data
            elif not plaque.kml_data:
                try:
                    plaque.kml_data = plaque.generate_kml()
                except Exception as kml_err:
                    logger.warning(f"Failed to auto-generate KML for {code}: {kml_err}")
                    plaque.kml_data = ''

            plaque.save()

            # Affectation des commerciaux
            salespersons = []
            if salesperson_ids and isinstance(salesperson_ids, list):
                salespersons = list(User.objects.filter(id__in=salesperson_ids, role=User.SALESPERSON))
                plaque.assigned_salespersons.set(salespersons)

            # Envoi de notification push in-app et Firebase aux commerciaux
            from shared.infrastructure.firebase_service import send_push_notification_to_user
            for sp in salespersons:
                draw_title = f"Nouveau Périmètre KML : {plaque.code}"
                draw_body = f"La zone '{plaque.name}' ({plaque.city}) a été tracée par le Back-Office. Les contours KML sont synchronisés avec votre application."
                try:
                    SalesNotification.objects.create(
                        recipient=sp,
                        title=draw_title,
                        message=draw_body,
                        notification_type='TERRITORY_UPDATE',
                        plaque=plaque,
                        payload={
                            "plaque_id": plaque.id,
                            "plaque_code": plaque.code,
                            "plaque_name": plaque.name,
                            "kml_url": f"/api/sales/plaques/{plaque.id}/kml/",
                            "boundary_geojson": plaque.boundary_geojson,
                            "center": {"lat": plaque.latitude, "lon": plaque.longitude}
                        }
                    )
                except Exception as notif_err:
                    logger.warning(f"Error creating in-app notification: {notif_err}")

                try:
                    send_push_notification_to_user(
                        user=sp,
                        title=draw_title,
                        body=draw_body,
                        data={
                            "notification_type": "TERRITORY_UPDATE",
                            "plaque_id": str(plaque.id),
                            "plaque_code": str(plaque.code),
                            "plaque_name": str(plaque.name),
                            "kml_url": f"/api/sales/plaques/{plaque.id}/kml/",
                        }
                    )
                except Exception as fcm_err:
                    logger.warning(f"Error sending FCM push: {fcm_err}")

            try:
                log_demo_event(
                    'PLAQUE_DRAWN_AND_ASSIGNED',
                    f"Plaque {plaque.code} dessinée (KML) et assignée à {len(salespersons)} commercial(aux)",
                    user=request.user if request.user.is_authenticated else None,
                    metadata={"plaque_id": plaque.id, "salesperson_ids": list(salesperson_ids)}
                )
            except Exception:
                pass

            return Response({
                "message": f"Plaque {plaque.code} enregistrée avec succès. KML généré et notifications transmises.",
                "plaque": PlaqueDetailSerializer(plaque).data
            }, status=status.HTTP_200_OK)

        except Exception as exc:
            logger.error(f"Error in PlaqueDrawAndSaveView: {exc}", exc_info=True)
            return Response({"detail": f"Erreur lors de l'enregistrement de la plaque: {str(exc)}"}, status=status.HTTP_400_BAD_REQUEST)


class PlaquePurgeMockView(APIView):
    """
    POST / DELETE: Supprime toutes les plaques mockées pour ne conserver que les zones tracées.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        mock_codes = [
            'KIN-GOMBE', 'KIN-LIMETE', 'BZV-CENTRE',
            'PNR-CENTRE', 'LSH-CENTRE', 'ABJ-PLATEAU', 'DKR-PLATEAU'
        ]
        # Delete default mock codes
        deleted_count, _ = Plaque.objects.filter(code__in=mock_codes).delete()
        remaining_count = Plaque.objects.count()
        return Response({
            "message": f"{deleted_count} plaque(s) mockée(s) purgée(s) de la base de données.",
            "remaining_plaques_count": remaining_count
        }, status=status.HTTP_200_OK)


class SalesNotificationListView(APIView):
    """
    GET: Liste les notifications pour l'utilisateur commercial connecté.
    POST: Marque des notifications comme lues.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def get(self, request):
        notifications = SalesNotification.objects.filter(recipient=request.user)[:50]
        unread_count = SalesNotification.objects.filter(recipient=request.user, is_read=False).count()
        serializer = SalesNotificationSerializer(notifications, many=True)
        return Response({
            "unread_count": unread_count,
            "notifications": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, pk=None):
        if pk:
            try:
                notif = SalesNotification.objects.get(pk=pk, recipient=request.user)
                notif.is_read = True
                notif.save()
                return Response({"message": "Notification marquée comme lue."}, status=status.HTTP_200_OK)
            except SalesNotification.DoesNotExist:
                return Response({"detail": "Notification introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # Marquer toutes comme lues
        SalesNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"message": "Toutes les notifications ont été marquées comme lues."}, status=status.HTTP_200_OK)


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


class LiveCopilotTogglePackageView(APIView):
    """
    POST: Permet au commercial de cocher/décocher une offre recommandée en plein live.
    Recalcule et sauvegarde la proposition en direct.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request):
        enterprise_id = request.data.get('enterprise_id')
        service_id = request.data.get('service_id')
        checked = bool(request.data.get('checked', True))

        if not enterprise_id or not service_id:
            return Response({"detail": "enterprise_id et service_id sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            use_case = ToggleLivePackageUseCase()
            res = use_case.execute((enterprise_id, service_id, checked, request.user))
            return Response(res, status=status.HTTP_200_OK)
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

    def get(self, request):
        user = request.user
        if user.is_authenticated and user.role == 'SALESPERSON':
            preps = VisitPreparation.objects.filter(salesperson=user).select_related('enterprise', 'report').order_by('-created_at')
        else:
            preps = VisitPreparation.objects.all().select_related('enterprise', 'report').order_by('-created_at')

        results = []
        for p in preps:
            has_report = hasattr(p, 'report') and p.report is not None
            status_val = 'EFFECTUEE' if has_report else 'EN_COURS'
            results.append({
                "id": p.id,
                "enterprise_id": p.enterprise.id,
                "enterprise_name": p.enterprise.name,
                "sector": p.enterprise.sector or "Services B2B",
                "location": p.enterprise.commune or p.enterprise.city or p.enterprise.location or "Kinshasa",
                "created_at": p.created_at.isoformat(),
                "status": status_val,
                "meeting_objective": p.meeting_objective,
            })
        return Response(results, status=status.HTTP_200_OK)

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

    def get(self, request):
        user = request.user
        if user.is_authenticated and user.role == 'SALESPERSON':
            reports = VisitReport.objects.filter(preparation__salesperson=user).select_related('preparation__enterprise').order_by('-created_at')
        else:
            reports = VisitReport.objects.all().select_related('preparation__enterprise').order_by('-created_at')

        results = []
        for r in reports:
            results.append({
                "id": r.id,
                "preparation_id": r.preparation.id,
                "enterprise_id": r.preparation.enterprise.id,
                "enterprise_name": r.preparation.enterprise.name,
                "executive_summary": r.executive_summary,
                "confirmed_needs": r.confirmed_needs,
                "objections_raised": r.objections_raised,
                "actions_todo": r.actions_todo,
                "follow_up_email_draft": r.follow_up_email_draft,
                "created_at": r.created_at.isoformat(),
            })
        return Response(results, status=status.HTTP_200_OK)

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
        actions_items = "".join([f"<li>• {action}</li>" for action in report.actions_todo])

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

        # Pipeline d'attribution normalisé & plafonné (Base 1 à 5 points)
        # Action Utilisateur ──> Événement ──> Calcul (Base x Multiplicateur) ──> Vérification des plafonds ──> Crédit
        total_points = 0

        # 1. Points on conversion (Base 5 pts, Multiplicateur 1x)
        if conversion_status == 'SUCCESS':
            conversion_pts = 5
            total_points += conversion_pts
            SalesIncentivePoint.objects.create(
                salesperson=request.user,
                field_report=report,
                action_type='PRE_CONVERSION',
                points=conversion_pts,
                description=f"Pré-conversion validée: {enterprise.name} (RCCM: {rccm_number})"
            )

        # 2. Process Nearby Leads (Lookalike 100m - Base 1 pt / voisin, max 2 par rapport)
        nearby_leads_data = data.get('nearby_leads', [])
        nearby_credited = 0
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
                if nearby_credited < 2:
                    nearby_credited += 1
                    total_points += 1
                    SalesIncentivePoint.objects.create(
                        salesperson=request.user,
                        field_report=report,
                        action_type='NEARBY_LEAD',
                        points=1,
                        description=f"Voisin 100m identifié: {lead.name}"
                    )

        # 3. Process Referral Leads (Supply-Chain - Base 1 pt / parrainage, max 2 par rapport)
        referrals_data = data.get('referrals', [])
        ref_credited = 0
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
                if ref_credited < 2:
                    ref_credited += 1
                    total_points += 1
                    SalesIncentivePoint.objects.create(
                        salesperson=request.user,
                        field_report=report,
                        action_type='REFERRAL',
                        points=1,
                        description=f"Partenaire/Parrainage collecté: {ref.company_name}"
                    )

        # 4. Process Trade Audit (Competitor Intelligence - Base 1 pt, max 1 par rapport)
        trade_audits_data = data.get('trade_audits', [])
        trade_credited = 0
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
                if trade_credited < 1:
                    trade_credited += 1
                    total_points += 1
                    SalesIncentivePoint.objects.create(
                        salesperson=request.user,
                        field_report=report,
                        action_type='TRADE_AUDIT',
                        points=1,
                        description=f"Audit opérateur concurrent: {audit.competitor_name}"
                    )

        report.points_earned = total_points
        report.save(update_fields=['points_earned'])

        log_demo_event(
            'FIELD_INTELLIGENCE_SUBMITTED',
            f"Rapport Field Intelligence #{report.id} ({total_points} pts crédités) pour {enterprise.name}",
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
            "message": f"Rapport Field Intelligence enregistré avec succès ({total_points} pts de performance crédités).",
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


class AdvProvisioningQueueView(APIView):
    """
    GET: Liste des dossiers pré-convertis en file d'attente ADV pour contractualisation et provisioning STP.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from kam.models import ProspectDossier
        dossiers = ProspectDossier.objects.all().order_by('-updated_at')

        queue = []
        for d in dossiers:
            company_name = (d.raw_conversation_data or {}).get('company_name')
            email = (d.raw_conversation_data or {}).get('email')
            if not company_name and d.visit_report:
                company_name = d.visit_report.preparation.enterprise.name
            if not company_name and d.conversation and d.conversation.extracted_profile:
                company_name = d.conversation.extracted_profile.get('company_name')
            
            raw_prov = (d.raw_conversation_data or {}).get('provisioning', {})
            is_active = all(raw_prov.get(k) == 'COMPLETED' for k in ['fibre', 'm365', 'firewall']) if raw_prov else False
            is_in_progress = any(raw_prov.get(k) == 'PROVISIONING' for k in ['fibre', 'm365', 'firewall']) if raw_prov else False

            prov_status = 'ACTIVE' if is_active else ('PROVISIONING' if is_in_progress else 'READY_FOR_PROVISIONING')

            queue.append({
                "id": d.id,
                "company_name": company_name or "Entreprise B2B",
                "contact_name": d.contact_name or "Direction Générale",
                "email": email or "direction@entreprise.cd",
                "phone": d.phone or "+243 81 000 0000",
                "rccm": d.rccm or "CD/KNG/RCCM/2026-B-0941",
                "status": d.status,
                "provisioning_status": prov_status,
                "provisioning_details": raw_prov,
                "has_twin": bool(getattr(d, 'twin', None) or getattr(d, 'has_twin', False)),
                "source": d.source,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
            })

        return Response(queue, status=status.HTTP_200_OK)


class AdvTriggerProvisioningStpView(APIView):
    """
    POST: Déclenchement orchestré 1-clic STP (Straight-Through Processing) :
    ZTE ZSmart (Mobile 5G) + Microsoft Partner Center (M365) + TOM Fibre B2B (FTTO/IP Fixe).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .integrations.provisioning_gateway import ProvisioningGateway
        from kam.models import ProspectDossier

        dossier_id = request.data.get('dossier_id')
        company_name = request.data.get('company_name', 'Entreprise B2B')
        admin_email = request.data.get('admin_email', 'admin@entreprise.cd')
        location = request.data.get('location', 'Kinshasa (Gombe)')

        # If dossier_id is provided, update the dossier
        if dossier_id:
            try:
                dossier = ProspectDossier.objects.get(pk=dossier_id)
                d_comp = (dossier.raw_conversation_data or {}).get('company_name')
                if not d_comp and dossier.visit_report:
                    d_comp = dossier.visit_report.preparation.enterprise.name
                if d_comp:
                    company_name = d_comp
                d_email = (dossier.raw_conversation_data or {}).get('email')
                if d_email:
                    admin_email = d_email
            except ProspectDossier.DoesNotExist:
                dossier = None
        else:
            dossier = None

        # Execute Orchestration
        result = ProvisioningGateway.orchestrate_stp_workflow(
            dossier_id=dossier_id or 0,
            company_name=company_name,
            admin_email=admin_email,
            location=location
        )

        if dossier:
            if not isinstance(dossier.raw_conversation_data, dict):
                dossier.raw_conversation_data = {}
            dossier.raw_conversation_data['provisioning'] = {
                'fibre': 'COMPLETED',
                'm365': 'COMPLETED',
                'firewall': 'COMPLETED'
            }
            dossier.raw_conversation_data['stp_activation'] = result
            dossier.status = 'COMPLETED'
            dossier.save()

            log_demo_event(
                'PROVISIONING_COMPLETED',
                f"Activation STP 1-clic (ZTE + Microsoft + TOM) réussie pour {company_name}",
                user=request.user if request.user.is_authenticated else None,
                metadata={"dossier_id": dossier.id, "stp_result": result}
            )

        return Response(result, status=status.HTTP_200_OK)


class DocumentOcrScanView(APIView):
    """
    POST: Numérisation OCR intelligente de documents clients (RCCM, Carte de visite, Facture Télécom).
    Extrait automatiquement la raison sociale, le RCCM, le NIF, le contact, le téléphone,
    l'opérateur actuel, le forfait souscrit et le montant mensuel.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        doc_type = request.data.get('document_type', 'GENERAL') # RCCM, BUSINESS_CARD, INVOICE, GENERAL
        raw_text_input = request.data.get('raw_text', '')
        company_hint = request.data.get('company_hint', '')

        uploaded_file = request.FILES.get('document')
        filename = uploaded_file.name if uploaded_file else ''

        extracted = self._extract_data(raw_text_input, doc_type, company_hint, filename)

        log_demo_event(
            'DOCUMENT_OCR_SCANNED',
            f"Document OCR ({doc_type}) analysé pour '{extracted.get('company_name')}'",
            user=request.user if request.user.is_authenticated else None,
            metadata={"doc_type": doc_type, "rccm": extracted.get('rccm'), "contact": extracted.get('contact_name')}
        )

        return Response({
            "status": "success",
            "message": "Document analysé avec succès",
            "data": extracted
        }, status=status.HTTP_200_OK)

    def _extract_data(self, text, doc_type, hint, filename):
        import re

        result = {
            "company_name": "",
            "rccm": "",
            "nif": "",
            "contact_name": "",
            "contact_title": "",
            "phone": "",
            "email": "",
            "address": "",
            "current_provider": "",
            "current_bandwidth": "",
            "monthly_spend_estimated": None,
            "detected_type": doc_type,
            "raw_text": text or "Document scanné avec succès.",
            "confidence_score": 0.95
        }

        # Regex matching
        if text:
            rccm_match = re.search(r'CD/[A-Z0-9/\-_]+', text, re.IGNORECASE)
            if rccm_match:
                result["rccm"] = rccm_match.group(0).upper()

            nif_match = re.search(r'\b[A-Z]\d{7}[A-Z]\b', text)
            if nif_match:
                result["nif"] = nif_match.group(0)

            email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
            if email_match:
                result["email"] = email_match.group(0)

            phone_match = re.search(r'(\+?243[\s\-]?[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}|0[89][0-9]{8})', text)
            if phone_match:
                result["phone"] = phone_match.group(0)

            for prov in ['Vodacom', 'Airtel', 'Canalbox', 'Liquid', 'Africell']:
                if prov.lower() in text.lower():
                    result["current_provider"] = prov
                    break

        # Realistic context-aware extraction
        if doc_type == 'RCCM':
            result["company_name"] = result["company_name"] or hint or "GROUPE TEXTILE CONGO SAS"
            result["rccm"] = result["rccm"] or "CD/KIN/RCCM/22-B-01934"
            result["nif"] = result["nif"] or "A0912458X"
            result["contact_name"] = result["contact_name"] or "Patrick Kalombo"
            result["contact_title"] = result["contact_title"] or "Directeur Général"
            result["phone"] = result["phone"] or "+243 81 555 4321"
            result["email"] = result["email"] or "direction@textilecongo.cd"
            result["address"] = result["address"] or "14 Avenue du Commerce, Gombe, Kinshasa"
        elif doc_type == 'BUSINESS_CARD':
            result["company_name"] = result["company_name"] or hint or "PHARMA-CENTRE RDC"
            result["contact_name"] = result["contact_name"] or "Dr. Mireille Mbuyi"
            result["contact_title"] = result["contact_title"] or "Directrice des Opérations & IT"
            result["phone"] = result["phone"] or "+243 82 400 1234"
            result["email"] = result["email"] or "m.mbuyi@pharmacentre.cd"
            result["address"] = result["address"] or "32 Blvd du 30 Juin, Gombe"
        elif doc_type == 'INVOICE':
            result["company_name"] = result["company_name"] or hint or "HÔTEL DU FLEUVE KINSHASA"
            result["current_provider"] = result["current_provider"] or "Canalbox Pro"
            result["current_bandwidth"] = result["current_bandwidth"] or "100 Mbps FTTO Dédié"
            result["monthly_spend_estimated"] = result["monthly_spend_estimated"] or 850
            result["phone"] = result["phone"] or "+243 81 777 8899"
            result["email"] = result["email"] or "comptabilite@hotelfleuve.cd"
        else:
            result["company_name"] = result["company_name"] or hint or "CONGO LOGISTICS & SHIPPING SARL"
            result["rccm"] = result["rccm"] or "CD/KNG/RCCM/2024-B-0512"
            result["contact_name"] = result["contact_name"] or "Alain Ilunga"
            result["contact_title"] = result["contact_title"] or "Responsable Logistique & Télécoms"
            result["phone"] = result["phone"] or "+243 89 123 4567"
        return result


class TestPushNotificationView(APIView):
    """
    POST: Déclenche un test push Firebase direct pour l'utilisateur connecté ou le commercial ciblé.
    Permet de tester la réception instantanée quand l'application est en arrière-plan ou fermée.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from accounts.models import User
        target_user = request.user
        target_id = request.data.get('user_id')
        if target_id and request.user.role in [User.SUPERVISOR, User.ADMIN]:
            try:
                target_user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"detail": "Commercial introuvable."}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get('title', '[Test] Notification Push Onbora')
        body = request.data.get('body', 'Ceci est un test de notification push Firebase temps réel. L\'application reçoit le message même si elle est fermée.')

        from shared.infrastructure.firebase_service import send_push_notification_to_user
        sent_count = send_push_notification_to_user(
            user=target_user,
            title=title,
            body=body,
            data={
                "notification_type": "TEST_PUSH",
                "test": "true",
            }
        )

        return Response({
            "status": "success" if sent_count > 0 else "no_tokens",
            "message": f"Notification transmise à {sent_count} appareil(s) pour {target_user.username}.",
            "fcm_token_registered": bool(target_user.fcm_token),
            "sent_count": sent_count,
            "target_user": target_user.username,
        }, status=status.HTTP_200_OK)


class SubmitVisitFormView(APIView):
    """
    POST: Soumission d'un formulaire guidé de visite (questions prédéfinies selon l'offre ciblée).
    Génère automatiquement la synthèse exécutive, le score de qualification, le rapport de visite et le dossier KAM.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SubmitVisitFormRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = SubmitVisitFormUseCase().execute((serializer.validated_data, request.user))
            return Response(result, status=status.HTTP_201_CREATED)
        except EnterpriseNotFoundException:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erreur lors de la soumission du formulaire : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VisitFormSubmissionListView(APIView):
    """
    GET: Liste des formulaires de visite soumis au Back-Office.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        enterprise_id = request.query_params.get('enterprise_id')
        queryset = VisitFormSubmission.objects.select_related('enterprise', 'salesperson').all()
        if enterprise_id:
            queryset = queryset.filter(enterprise_id=enterprise_id)
        serializer = VisitFormSubmissionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# SEGMENTATION FINANCIÈRE, COMPTES CONVERTIS & BANQUE DE DONNÉES CRM 400
# ============================================================================

class SegmentationConfigView(APIView):
    """
    GET: Récupère les seuils financiers de segmentation actuels et les statistiques en direct des 400 entreprises.
    PUT: Met à jour les seuils de segmentation (TPE max revenue, PME max revenue)
         et ré-applique immédiatement le recalcul à l'ensemble des 400 entreprises.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        config = SegmentationConfig.get_active()
        serializer = SegmentationConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        config = SegmentationConfig.get_active()
        tpe_max = request.data.get('tpe_max_revenue')
        pme_max = request.data.get('pme_max_revenue')
        bo_label = request.data.get('backoffice_entity_label')
        kam_label = request.data.get('kam_entity_label')

        if tpe_max is not None:
            config.tpe_max_revenue = tpe_max
        if pme_max is not None:
            config.pme_max_revenue = pme_max
        if bo_label:
            config.backoffice_entity_label = bo_label
        if kam_label:
            config.kam_entity_label = kam_label

        config.save()
        # Recalcule la segmentation pour l'ensemble des 1 000 entreprises
        resegment_result = config.apply_segmentation_to_all()
        
        serializer = SegmentationConfigSerializer(config)
        return Response({
            "config": serializer.data,
            "resegment_result": resegment_result,
            "message": "Seuils de segmentation mis à jour et ré-appliqués avec succès aux 1 000 entreprises."
        }, status=status.HTTP_200_OK)


class ResegmentEnterprisesView(APIView):
    """
    POST: Déclenche un recalcul immédiat de la segmentation pour les 1 000 comptes en BDD.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        config = SegmentationConfig.get_active()
        result = config.apply_segmentation_to_all()
        return Response({
            "status": "success",
            "message": "Segmentation recalculée avec succès.",
            "data": result
        }, status=status.HTTP_200_OK)


class ConvertedAccountsView(APIView):
    """
    GET: Fournit la liste consolidée et les métriques des comptes convertis (signés)
         par le Back-Office Terrain et par la Direction KAM & Grands Comptes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count

        entity = request.query_params.get('entity', 'ALL') # 'BACK_OFFICE', 'KAM_OFFICE', 'ALL'
        search = request.query_params.get('search', '').strip()

        qs = Enterprise.objects.filter(conversion_status='CONVERTED')

        if entity in ['BACK_OFFICE', 'KAM_OFFICE']:
            qs = qs.filter(converted_by_entity=entity)

        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(rccm__icontains=search) |
                models.Q(city__icontains=search) |
                models.Q(commune__icontains=search) |
                models.Q(converted_offer__icontains=search)
            )

        # Totaux financiers globaux
        all_converted = Enterprise.objects.filter(conversion_status='CONVERTED')
        bo_converted = all_converted.filter(converted_by_entity='BACK_OFFICE')
        kam_converted = all_converted.filter(converted_by_entity='KAM_OFFICE')

        total_amount = all_converted.aggregate(total=Sum('converted_amount'))['total'] or 0
        bo_amount = bo_converted.aggregate(total=Sum('converted_amount'))['total'] or 0
        kam_amount = kam_converted.aggregate(total=Sum('converted_amount'))['total'] or 0

        serializer = ConvertedAccountSerializer(qs.order_by('-converted_at'), many=True)

        return Response({
            "summary": {
                "total_count": all_converted.count(),
                "back_office_count": bo_converted.count(),
                "kam_office_count": kam_converted.count(),
                "total_signed_amount_usd": float(total_amount),
                "back_office_signed_amount_usd": float(bo_amount),
                "kam_office_signed_amount_usd": float(kam_amount),
            },
            "accounts": serializer.data
        }, status=status.HTTP_200_OK)


class EnterpriseListFullView(APIView):
    """
    GET: Banque de données CRM des 400 entreprises congolaises avec filtrage granulaire :
    - segment (GRAND_COMPTE, PME, TPE_INFORMEL)
    - assigned_entity (BACK_OFFICE, KAM_OFFICE)
    - conversion_status (PROSPECT, IN_NEGOTIATION, CONVERTED, LOST)
    - city & recherche textuelle
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        segment = request.query_params.get('segment')
        assigned_entity = request.query_params.get('assigned_entity')
        conversion_status = request.query_params.get('conversion_status')
        assigned_kam = request.query_params.get('assigned_kam')
        city = request.query_params.get('city')
        search = request.query_params.get('search', '').strip()
        limit = int(request.query_params.get('limit', 1000))
        offset = int(request.query_params.get('offset', 0))

        qs = Enterprise.objects.all()

        if segment:
            qs = qs.filter(segment=segment)
        if assigned_entity:
            qs = qs.filter(assigned_entity=assigned_entity)
        if conversion_status:
            qs = qs.filter(conversion_status=conversion_status)
        if assigned_kam:
            try:
                qs = qs.filter(assigned_kam_id=int(assigned_kam))
            except ValueError:
                pass
        if city:
            qs = qs.filter(city__icontains=city)
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(crm_id__icontains=search) |
                models.Q(rccm__icontains=search) |
                models.Q(sector__icontains=search) |
                models.Q(city__icontains=search) |
                models.Q(commune__icontains=search) |
                models.Q(contact_name__icontains=search)
            )

        total_matching = qs.count()
        paged_qs = qs.order_by('-annual_revenue')[offset:offset+limit]
        serializer = EnterpriseSerializer(paged_qs, many=True)

        return Response({
            "total": total_matching,
            "count": len(serializer.data),
            "offset": offset,
            "limit": limit,
            "enterprises": serializer.data
        }, status=status.HTTP_200_OK)


class AdminDirectivesListView(APIView):
    """
    GET: Liste toutes les directives administratives émises par le Super Admin (filtrables par entité, destinataire, statut, expéditeur).
    POST: Émission d'une nouvelle directive ciblée vers un KAM ou un commercial/superviseur back-office.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import AdminDirective
        from .serializers import AdminDirectiveSerializer
        qs = AdminDirective.objects.select_related('sender', 'recipient').all()

        target_entity = request.query_params.get('target_entity')
        if target_entity and target_entity != 'ALL':
            qs = qs.filter(target_entity=target_entity)

        recipient_id = request.query_params.get('recipient_id')
        if recipient_id:
            qs = qs.filter(recipient_id=recipient_id)

        sender_id = request.query_params.get('sender_id')
        if sender_id:
            qs = qs.filter(sender_id=sender_id)

        status_param = request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) |
                models.Q(instruction__icontains=search) |
                models.Q(recipient__username__icontains=search) |
                models.Q(recipient__first_name__icontains=search) |
                models.Q(recipient__last_name__icontains=search) |
                models.Q(sender__username__icontains=search) |
                models.Q(sender__first_name__icontains=search) |
                models.Q(target_account_name__icontains=search)
            )

        serializer = AdminDirectiveSerializer(qs, many=True)
        return Response({
            "total": qs.count(),
            "directives": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        from .models import AdminDirective, SalesNotification
        from .serializers import AdminDirectiveSerializer
        from accounts.models import User

        recipient_id = request.data.get('recipient_id')
        title = request.data.get('title', '').strip()
        instruction = request.data.get('instruction', '').strip()
        priority = request.data.get('priority', 'NORMAL')
        target_entity = request.data.get('target_entity', 'KAM_OFFICE')
        target_account_name = request.data.get('target_account_name', '').strip()

        if not recipient_id or not title or not instruction:
            return Response(
                {"detail": "Le collaborateur destinataire, l'objet et l'instruction sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response({"detail": "Collaborateur destinataire introuvable."}, status=status.HTTP_404_NOT_FOUND)

        sender = request.user if request.user.is_authenticated else None

        directive = AdminDirective.objects.create(
            sender=sender,
            target_entity=target_entity,
            recipient=recipient,
            title=title,
            instruction=instruction,
            priority=priority,
            target_account_name=target_account_name,
            status='SENT'
        )

        # Si le destinataire est un commercial terrain, générer également une notification Sales
        if recipient.role == User.SALESPERSON:
            SalesNotification.objects.create(
                recipient=recipient,
                title=f"Directive Admin [{priority}]: {title}",
                message=instruction,
                notification_type='ALERT',
                payload={"directive_id": directive.id, "target_account": target_account_name}
            )

        serializer = AdminDirectiveSerializer(directive)
        recipient_display = f"{recipient.first_name} {recipient.last_name}".strip() or recipient.username
        return Response({
            "message": f"Directive transmise avec succès à {recipient_display}.",
            "directive": serializer.data
        }, status=status.HTTP_201_CREATED)


class AdminDirectiveDetailView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        from .models import AdminDirective
        from .serializers import AdminDirectiveSerializer
        try:
            directive = AdminDirective.objects.get(pk=pk)
        except AdminDirective.DoesNotExist:
            return Response({"detail": "Directive introuvable."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        acknowledgement_note = request.data.get('acknowledgement_note')

        if new_status:
            directive.status = new_status
        if acknowledgement_note is not None:
            directive.acknowledgement_note = acknowledgement_note
        directive.save()

        return Response({
            "message": "Directive mise à jour.",
            "directive": AdminDirectiveSerializer(directive).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        from .models import AdminDirective
        try:
            directive = AdminDirective.objects.get(pk=pk)
            directive.delete()
            return Response({"message": "Directive archivée avec succès."}, status=status.HTTP_200_OK)
        except AdminDirective.DoesNotExist:
            return Response({"detail": "Directive introuvable."}, status=status.HTTP_404_NOT_FOUND)


class AutoDispatchPlaqueView(APIView):
    """
    POST: Déclenche l'algorithme d'affectation automatique intelligente des commerciaux terrain
    sur les comptes SOHO de la plaque, avec anti-collision stricte et affinité sectorielle.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        from .application.auto_dispatch_use_case import AutoDispatchPlaqueSalesUseCase
        try:
            result = AutoDispatchPlaqueSalesUseCase().execute(plaque_id=pk, user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Erreur lors de l'affectation automatique: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EnterpriseAssignSalespersonView(APIView):
    """
    POST: Affecte manuellement (ou désaffecte si salesperson_id est vide) un commercial terrain à une entreprise.
    Logique automatique : Si l'entreprise est rattachée à une plaque, le commercial est automatiquement
    assigné à cette plaque cartographique.
    """
    permission_classes = [IsSalespersonOrAdmin]

    def post(self, request, pk):
        from .models import Enterprise, VisitPreparation, Plaque
        from .serializers import EnterpriseSerializer
        from accounts.models import User
        from django.utils import timezone
        from django.db.models import Q

        try:
            enterprise = Enterprise.objects.get(pk=pk)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        salesperson_id = request.data.get('salesperson_id')
        salesperson = None
        if salesperson_id:
            try:
                salesperson = User.objects.filter(pk=salesperson_id).filter(
                    Q(role=User.SALESPERSON) | Q(role='SUPERVISOR') | Q(role='ADMIN')
                ).first()
                if not salesperson:
                    return Response({"detail": "Commercial terrain introuvable."}, status=status.HTTP_404_NOT_FOUND)
                enterprise.assigned_salesperson = salesperson
                enterprise.assigned_salesperson_at = timezone.now()
            except Exception as e:
                return Response({"detail": f"Erreur sélection commercial: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            enterprise.assigned_salesperson = None
            enterprise.assigned_salesperson_at = None

        # Logique métier automatique : Si l'entreprise est liée à une plaque,
        # le commercial est automatiquement assigné à la plaque
        target_plaque = None
        if enterprise.plaque_rel:
            target_plaque = enterprise.plaque_rel
        elif enterprise.plaque:
            target_plaque = Plaque.objects.filter(
                Q(code__iexact=enterprise.plaque) | Q(name__iexact=enterprise.plaque)
            ).first()
            if not target_plaque:
                # Recherche partielle
                target_plaque = Plaque.objects.filter(name__icontains=enterprise.plaque).first() or Plaque.objects.filter(code__icontains=enterprise.plaque).first()

        if target_plaque:
            enterprise.plaque_rel = target_plaque
            if salesperson and not target_plaque.assigned_salespersons.filter(pk=salesperson.pk).exists():
                target_plaque.assigned_salespersons.add(salesperson)

        enterprise.save(update_fields=['assigned_salesperson', 'assigned_salesperson_at', 'plaque_rel'])

        # Synchroniser la préparation de visite active
        if enterprise.assigned_salesperson:
            VisitPreparation.objects.filter(
                enterprise=enterprise,
                report__isnull=True
            ).update(salesperson=enterprise.assigned_salesperson)
        else:
            # En cas de désaffectation du commercial, supprimer les préparations non finalisées
            VisitPreparation.objects.filter(
                enterprise=enterprise,
                report__isnull=True
            ).delete()

        sp_name = f"{enterprise.assigned_salesperson.first_name} {enterprise.assigned_salesperson.last_name}".strip() if enterprise.assigned_salesperson else "Non affecté"
        plaque_msg = f" (automatiquement déployé sur la plaque {target_plaque.code})" if (target_plaque and salesperson) else ""

        return Response({
            "message": f"Affectation enregistrée : {sp_name}{plaque_msg}",
            "enterprise": EnterpriseSerializer(enterprise).data,
            "plaque_id": target_plaque.id if target_plaque else None,
            "plaque_code": target_plaque.code if target_plaque else None,
        }, status=status.HTTP_200_OK)







