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
