from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsKAMOrAdmin
from sales.models import Enterprise
from .services.installed_offer_service import InstalledOfferSerializer, sector_options


class KamInstalledOffersView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, account_id):
        enterprise = get_object_or_404(Enterprise, pk=account_id)
        if request.query_params.get('options') == 'sector':
            return Response(sector_options(enterprise))
        return Response(InstalledOfferSerializer(enterprise.installed_offers.order_by('-created_at'), many=True).data)

    @transaction.atomic
    def post(self, request, account_id):
        enterprise = get_object_or_404(Enterprise, pk=account_id)
        data = request.data.copy()
        if not data.get('installed_offer_name') and data.get('name'):
            data['installed_offer_name'] = data['name']
        serializer = InstalledOfferSerializer(data=data, context={'enterprise': enterprise})
        serializer.is_valid(raise_exception=True)
        serializer.save(enterprise=enterprise)
        return Response(serializer.data, status=201)


class KamInstalledOfferDetailView(APIView):
    permission_classes = [IsKAMOrAdmin]

    @transaction.atomic
    def delete(self, request, account_id, offer_id):
        enterprise = get_object_or_404(Enterprise, pk=account_id)
        offer = get_object_or_404(enterprise.installed_offers, pk=offer_id)
        offer.delete()
        return Response(status=204)
