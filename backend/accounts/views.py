from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsAdmin
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer
from .models import User
from .application.use_cases import RegisterUserUseCase, LoginUserUseCase, GetMeUseCase, ListKAMsUseCase
from .application.dtos import RegisterRequestDTO, LoginRequestDTO
from .domain.exceptions import DomainException


class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            dto = RegisterRequestDTO(
                username=serializer.validated_data['username'],
                email=serializer.validated_data.get('email', ''),
                password=serializer.validated_data['password'],
                role=serializer.validated_data.get('role', User.CLIENT_B2B),
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
        return Response({
            "id": user_dto.id,
            "username": user_dto.username,
            "email": user_dto.email,
            "role": user_dto.role,
            "phone": user_dto.phone,
            "company_name": user_dto.company_name,
            "first_name": user_dto.first_name,
            "last_name": user_dto.last_name,
            "avatar": user_dto.avatar or "memoji_056.png",
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data
        if 'avatar' in data:
            user.avatar = str(data['avatar']).strip()
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


class KAMListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        kams = ListKAMsUseCase().execute()
        from sales.models import Enterprise
        from django.db.models import Sum

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


class ManagersView(APIView):
    """
    Gestion des comptes d'encadrement créés par l'Admin :
    - Superviseurs Back-Office Terrain (SUPERVISOR)
    - Gérants KAM Office / Direction Grands Comptes (KAM_MANAGER)
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        role_filter = request.query_params.get('role', None)
        qs = User.objects.filter(role__in=[User.SUPERVISOR, User.KAM_MANAGER]).order_by('-date_joined')
        if role_filter in [User.SUPERVISOR, User.KAM_MANAGER]:
            qs = qs.filter(role=role_filter)
        
        users_data = []
        for u in qs:
            users_data.append({
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
                "avatar": u.avatar or "memoji_056.png",
                "date_joined": u.date_joined.isoformat() if u.date_joined else None
            })
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
        avatar = data.get('avatar', 'memoji_056.png').strip() or 'memoji_056.png'

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
                "avatar": user.avatar
            }
        }, status=status.HTTP_201_CREATED)


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


