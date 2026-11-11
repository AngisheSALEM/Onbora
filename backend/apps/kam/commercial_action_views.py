"""Read-only commercial action page data."""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_core.services.commercial_action import build_commercial_action
from kam.models import B2BNewsFeedItem


class B2BNewsCommercialActionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        privileged = user.is_staff or user.is_superuser or user.role == "ADMIN"
        if not privileged and user.role != "KAM":
            raise PermissionDenied("Accès réservé aux équipes KAM.")
        items = B2BNewsFeedItem.objects.select_related("enterprise")
        if not privileged:
            items = items.filter(Q(is_web_discovery=True)
                                 | Q(enterprise__assigned_kam=user)
                                 | Q(enterprise__assigned_kam__isnull=True))
        item = get_object_or_404(items, pk=pk)
        company_name = (item.discovered_company_name if item.is_web_discovery
                        else item.enterprise.name if item.enterprise else "")
        action = build_commercial_action(
            company_name=company_name,
            commercial_angle=item.commercial_angle,
            signal_rationale=item.signal_rationale,
            recommended_offer=item.recommended_offer,
            recommended_action=item.recommended_action,
        )
        action["can_add_to_portfolio"] = item.is_web_discovery and not item.is_converted_to_portfolio
        action["is_in_portfolio"] = not item.is_web_discovery or item.is_converted_to_portfolio
        return Response(action)
