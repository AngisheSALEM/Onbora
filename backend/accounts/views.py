from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
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
        }, status=status.HTTP_200_OK)


class KAMListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        kams = ListKAMsUseCase().execute()
        return Response([
            {
                "id": k.id,
                "username": k.username,
                "email": k.email,
                "role": k.role,
                "phone": k.phone,
                "company_name": k.company_name,
                "first_name": k.first_name,
                "last_name": k.last_name,
            }
            for k in kams
        ], status=status.HTTP_200_OK)
