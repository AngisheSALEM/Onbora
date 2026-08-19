from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from accounts.permissions import IsAdmin
from .models import ServiceCatalog
from .serializers import ServiceCatalogSerializer
from .application.use_cases import (
    ListServicesUseCase,
    GetServiceDetailUseCase,
    CreateServiceUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
    UploadCatalogUseCase,
)
from .application.dtos import CreateServiceDTO, UpdateServiceDTO
from .domain.exceptions import ServiceNotFoundException


class ServiceCatalogListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request):
        services = ListServicesUseCase().execute()
        return Response([
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "description": s.description,
                "benefits": s.benefits,
                "technical_requirements": s.technical_requirements,
            }
            for s in services
        ])

    def post(self, request):
        serializer = ServiceCatalogSerializer(data=request.data)
        if serializer.is_valid():
            dto = CreateServiceDTO(
                name=serializer.validated_data['name'],
                category=serializer.validated_data['category'],
                description=serializer.validated_data['description'],
                benefits=serializer.validated_data.get('benefits', ''),
                technical_requirements=serializer.validated_data.get('technical_requirements', {}),
            )
            service_dto = CreateServiceUseCase().execute(dto)
            return Response({
                "id": service_dto.id,
                "name": service_dto.name,
                "category": service_dto.category,
                "description": service_dto.description,
                "benefits": service_dto.benefits,
                "technical_requirements": service_dto.technical_requirements,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ServiceCatalogDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request, pk):
        try:
            s = GetServiceDetailUseCase().execute(pk)
            return Response({
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "description": s.description,
                "benefits": s.benefits,
                "technical_requirements": s.technical_requirements,
            })
        except ServiceNotFoundException:
            return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        serializer = ServiceCatalogSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            dto = UpdateServiceDTO(
                name=serializer.validated_data.get('name'),
                category=serializer.validated_data.get('category'),
                description=serializer.validated_data.get('description'),
                benefits=serializer.validated_data.get('benefits'),
                technical_requirements=serializer.validated_data.get('technical_requirements'),
            )
            try:
                s = UpdateServiceUseCase().execute((pk, dto))
                return Response({
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "description": s.description,
                    "benefits": s.benefits,
                    "technical_requirements": s.technical_requirements,
                })
            except ServiceNotFoundException:
                return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            DeleteServiceUseCase().execute(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ServiceNotFoundException:
            return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)


class CatalogUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"detail": "Aucun fichier n'a été téléversé."}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        MAX_FILE_SIZE = 15 * 1024 * 1024
        if uploaded_file.size > MAX_FILE_SIZE:
            return Response(
                {"detail": "Le fichier du catalogue est trop volumineux. La taille maximale autorisée est de 15 Mo."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        result = UploadCatalogUseCase().execute((uploaded_file.name, uploaded_file))
        return Response({
            "filename": result.filename,
            "file_type": result.file_type,
            "services_found_count": result.services_found_count,
            "services": result.services
        }, status=status.HTTP_200_OK)
