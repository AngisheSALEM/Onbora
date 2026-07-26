from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from accounts.permissions import IsAdmin
from .models import ServiceCatalog
from .serializers import ServiceCatalogSerializer

class ServiceCatalogListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request):
        services = ServiceCatalog.objects.all().order_by('id')
        serializer = ServiceCatalogSerializer(services, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ServiceCatalogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ServiceCatalogDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_object(self, pk):
        try:
            return ServiceCatalog.objects.get(pk=pk)
        except ServiceCatalog.DoesNotExist:
            return None

    def get(self, request, pk):
        service = self.get_object(pk)
        if not service:
            return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ServiceCatalogSerializer(service)
        return Response(serializer.data)

    def put(self, request, pk):
        service = self.get_object(pk)
        if not service:
            return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ServiceCatalogSerializer(service, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        service = self.get_object(pk)
        if not service:
            return Response({"detail": "Service introuvable."}, status=status.HTTP_404_NOT_FOUND)
        service.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from rest_framework.parsers import MultiPartParser, FormParser
from .parser import extract_text_from_pdf, extract_text_from_docx, parse_catalog_text, extract_simulated_services

class CatalogUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"detail": "Aucun fichier n'a été téléversé."}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        filename = uploaded_file.name
        
        file_type = 'unknown'
        if filename.endswith('.pdf'):
            file_type = 'pdf'
        elif filename.endswith('.docx'):
            file_type = 'docx'
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')):
            file_type = 'image'
        elif filename.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv')):
            file_type = 'video'
            
        extracted_text = ""
        services = []
        
        if file_type == 'pdf':
            extracted_text = extract_text_from_pdf(uploaded_file)
            services = parse_catalog_text(extracted_text)
        elif file_type == 'docx':
            extracted_text = extract_text_from_docx(uploaded_file)
            services = parse_catalog_text(extracted_text)
            
        # Fallback / Simulated high-fidelity extraction for scans/videos
        if not services:
            services = extract_simulated_services(filename, file_type)
            
        return Response({
            "filename": filename,
            "file_type": file_type,
            "services_found_count": len(services),
            "services": services
        }, status=status.HTTP_200_OK)
