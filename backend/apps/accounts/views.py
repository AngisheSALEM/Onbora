import os
import uuid
from django.conf import settings
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsAdmin
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer
from .models import User
from .application.use_cases import RegisterUserUseCase, LoginUserUseCase, GetMeUseCase, ListKAMsUseCase
from .application.dtos import RegisterRequestDTO, LoginRequestDTO
from .domain.exceptions import DomainException
from shared.pagination import StandardResultsSetPagination


class RegisterView(APIView):
    """
    Création de comptes collaborateurs réservée exclusivement à l'Administrateur N+1.
    """
    permission_classes = [IsAdmin]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            dto = RegisterRequestDTO(
                username=serializer.validated_data['username'],
                email=serializer.validated_data.get('email', ''),
                password=serializer.validated_data['password'],
                role=serializer.validated_data.get('role', User.SALESPERSON),
                phone=serializer.validated_data.get('phone', ''),
                company_name=serializer.validated_data.get('company_name', ''),
                first_name=serializer.validated_data.get('first_name', ''),
                last_name=serializer.validated_data.get('last_name', ''),
            )
            try:
                result = RegisterUserUseCase().execute(dto)
                return Response({
                    "token": result.token,
                    "user": {
                        "id": result.user.id,
                        "username": result.user.username,
                        "email": result.user.email,
                        "role": result.user.role,
                        "phone": result.user.phone,
                        "company_name": result.user.company_name,
                        "first_name": result.user.first_name,
                        "last_name": result.user.last_name,
                    }
                }, status=status.HTTP_201_CREATED)
            except DomainException as e:
                return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            from rest_framework.authtoken.models import Token
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_dto = GetMeUseCase().execute(request.user)
        avatar_val = request.user.profile_picture_url or request.user.avatar or user_dto.avatar or "/avatars/default_avatar.svg"
        return Response({
            "id": user_dto.id,
            "username": user_dto.username,
            "email": user_dto.email,
            "role": user_dto.role,
            "phone": user_dto.phone,
            "company_name": user_dto.company_name,
            "first_name": user_dto.first_name,
            "last_name": user_dto.last_name,
            "avatar": avatar_val,
            "profile_picture_url": avatar_val,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data
        if 'avatar' in data:
            user.avatar = str(data['avatar']).strip()
        if 'profile_picture_url' in data:
            user.profile_picture_url = str(data['profile_picture_url']).strip()
        if 'first_name' in data:
            user.first_name = str(data['first_name']).strip()
        if 'last_name' in data:
            user.last_name = str(data['last_name']).strip()
        if 'phone' in data:
            user.phone = str(data['phone']).strip()
        user.save()
        return Response({
            "message": "Profil mis à jour avec succès.",
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class AvatarUploadView(APIView):
    """
    Téléversement sécurisé de photo de profil pour l'utilisateur connecté ou pour attribution.
    Supporte les formats JPEG, PNG, WebP avec validation stricte de taille (< 5 Mo).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
    ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Mo

    def post(self, request):
        file_obj = request.FILES.get('file') or request.FILES.get('avatar') or request.FILES.get('photo')
        if not file_obj:
            return Response({"detail": "Aucun fichier image fourni."}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > self.MAX_FILE_SIZE:
            return Response({"detail": "La taille du fichier ne doit pas dépasser 5 Mo."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response({"detail": "Format de fichier non supporté. Formats acceptés : JPEG, PNG, WebP."}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(file_obj, 'content_type') and file_obj.content_type not in self.ALLOWED_MIME_TYPES:
            return Response({"detail": "Type MIME non autorisé. Seules les images JPEG, PNG et WebP sont acceptées."}, status=status.HTTP_400_BAD_REQUEST)

        # Créer le répertoire média avatars
        avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatars_dir, exist_ok=True)

        filename = f"avatar_u{request.user.id}_{uuid.uuid4().hex[:10]}{ext}"
        filepath = os.path.join(avatars_dir, filename)

        with open(filepath, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        media_url = settings.MEDIA_URL.rstrip('/')
        relative_url = f"{media_url}/avatars/{filename}"
        if not relative_url.startswith('/'):
            relative_url = f"/{relative_url}"

        # Mettre à jour le profil connecté sauf si apply_to_self=false (ex: pré-upload admin)
        apply_to_self_param = request.data.get('apply_to_self', 'true')
        apply_to_self = True
        if isinstance(apply_to_self_param, str):
            apply_to_self = apply_to_self_param.lower() in ('true', '1', 'yes')

        if apply_to_self:
            request.user.avatar = relative_url
            request.user.profile_picture_url = relative_url
            request.user.save(update_fields=['avatar', 'profile_picture_url'])

        return Response({
            "message": "Photo de profil téléversée avec succès.",
            "url": relative_url,
            "avatar": relative_url,
            "profile_picture_url": relative_url,
            "user": UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)


class KAMListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        kams = ListKAMsUseCase().execute()
        from sales.models import Enterprise
        from django.db.models import Sum

        search = request.query_params.get('search', '').strip().lower()
        if search:
            kams = [
                k for k in kams
                if search in (k.first_name or '').lower()
                or search in (k.last_name or '').lower()
                or search in (k.username or '').lower()
                or search in (k.email or '').lower()
                or search in (k.company_name or '').lower()
            ]

        results = []
        for k in kams:
            assigned_count = Enterprise.objects.filter(assigned_kam_id=k.id).count()
            converted_qs = Enterprise.objects.filter(converted_by_user_id=k.id, conversion_status='CONVERTED')
            converted_count = converted_qs.count()
            converted_amount = converted_qs.aggregate(total=Sum('converted_amount'))['total'] or 0.0

            results.append({
                "id": k.id,
                "username": k.username,
                "email": k.email,
                "role": k.role,
                "phone": k.phone,
                "company_name": k.company_name or "Portefeuille Grands Comptes & PME",
                "first_name": k.first_name,
                "last_name": k.last_name,
                "full_name": f"{k.first_name} {k.last_name}".strip() or k.username,
                "avatar": getattr(k, 'avatar', 'memoji_019.png') or "memoji_019.png",
                "portfolio_count": assigned_count,
                "converted_count": converted_count,
                "converted_amount": float(converted_amount),
                "is_active": getattr(k, 'is_active', True),
            })

        if request.query_params.get('page'):
            paginator = StandardResultsSetPagination()
            paged_kams = paginator.paginate_queryset(results, request)
            return paginator.get_paginated_response(paged_kams, extra_context={
                "kams": paged_kams
            })

        return Response(results, status=status.HTTP_200_OK)


class FCMTokenUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fcm_token = request.data.get('fcm_token', '').strip()
        device_type = request.data.get('device_type', 'android')
        device_name = request.data.get('device_name', '')

        if not fcm_token:
            return Response({"detail": "Le token FCM est requis."}, status=status.HTTP_400_BAD_REQUEST)

        # Mettre à jour le token principal de l'utilisateur
        request.user.fcm_token = fcm_token
        request.user.save(update_fields=['fcm_token'])

        # Enregistrer ou mettre à jour le terminal de l'utilisateur
        from .models import UserDevice
        device, created = UserDevice.objects.update_or_create(
            fcm_token=fcm_token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'device_name': device_name,
                'is_active': True,
            }
        )

        return Response({
            "status": "success",
            "message": "Jeton FCM enregistré avec succès.",
            "device_id": device.id,
            "created": created,
        }, status=status.HTTP_200_OK)


def _serialize_manager_user(u) -> dict:
    avatar_val = u.profile_picture_url or u.avatar or "/avatars/default_avatar.svg"
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": f"{u.first_name} {u.last_name}".strip() or u.username,
        "role": u.role,
        "role_display": u.get_role_display(),
        "phone": u.phone,
        "company_name": u.company_name,
        "location": u.location,
        "is_active": u.is_active,
        "avatar": avatar_val,
        "profile_picture_url": avatar_val,
        "date_joined": u.date_joined.isoformat() if u.date_joined else None
    }


class ManagersView(APIView):
    """
    Gestion des comptes d'encadrement créés par l'Admin :
    - Superviseurs Back-Office Terrain (SUPERVISOR)
    - Gérants KAM Office / Direction Grands Comptes (KAM_MANAGER)
    Supporte la pagination serveur avec ?page= et ?page_size=.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.db.models import Q
        role_filter = request.query_params.get('role', None)
        search = request.query_params.get('search', '').strip()
        qs = User.objects.filter(role__in=[User.SUPERVISOR, User.KAM_MANAGER]).order_by('-date_joined')
        if role_filter in [User.SUPERVISOR, User.KAM_MANAGER]:
            qs = qs.filter(role=role_filter)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(location__icontains=search)
            )
        
        # Support de la pagination serveur automatique
        if request.query_params.get('page'):
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(qs, request)
            users_data = [_serialize_manager_user(u) for u in page]
            return paginator.get_paginated_response(users_data, extra_context={
                "managers": users_data
            })

        users_data = [_serialize_manager_user(u) for u in qs]
        return Response(users_data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', User.SUPERVISOR)
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        phone = data.get('phone', '').strip()
        location = data.get('location', '').strip()
        avatar = data.get('avatar', '').strip() or data.get('profile_picture_url', '').strip() or '/avatars/default_avatar.svg'
        profile_picture_url = data.get('profile_picture_url', '').strip() or (avatar if avatar.startswith('/') or avatar.startswith('http') else '')

        if not username or not password:
            return Response({"detail": "Le nom d'utilisateur et le mot de passe sont obligatoires."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in [User.SUPERVISOR, User.KAM_MANAGER]:
            return Response({"detail": "Le rôle doit être soit SUPERVISOR (Back-Office) soit KAM_MANAGER (Gérant KAM)."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": f"Un compte avec l'identifiant '{username}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            phone=phone,
            location=location,
            company_name="Onbora Direction Commerciale" if role == User.SUPERVISOR else "Onbora Direction Grands Comptes"
        )
        user.avatar = avatar
        user.profile_picture_url = profile_picture_url
        user.is_staff = True
        user.save()

        return Response({
            "message": f"Compte {user.get_role_display()} créé avec succès.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "role": user.role,
                "role_display": user.get_role_display(),
                "phone": user.phone,
                "location": user.location,
                "is_active": user.is_active,
                "avatar": user.avatar,
                "profile_picture_url": user.profile_picture_url
            }
        }, status=status.HTTP_201_CREATED)


class ManagerListAPIView(generics.ListAPIView):
    """
    Option B : Vue basée sur une classe (CBV - Recommandé)
    Django / DRF gère la pagination automatiquement via StandardResultsSetPagination.
    """
    serializer_class = UserSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAdmin]

    def get_queryset(self):
        role_filter = self.request.query_params.get('role', None)
        qs = User.objects.filter(role__in=[User.SUPERVISOR, User.KAM_MANAGER]).order_by('-date_joined')
        if role_filter in [User.SUPERVISOR, User.KAM_MANAGER]:
            qs = qs.filter(role=role_filter)
        return qs


class ManagerToggleActiveView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role__in=[User.SUPERVISOR, User.KAM_MANAGER])
        except User.DoesNotExist:
            return Response({"detail": "Gestionnaire introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "message": f"Statut du compte mis à jour: {'Actif' if user.is_active else 'Désactivé'}."
        }, status=status.HTTP_200_OK)


