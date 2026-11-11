from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsKAMOrAdmin
from .services.account_activity_service import (
    account_for_user, account_activity, action_item, create_action, transition_action,
)


class AccountActivityView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, account_id):
        return Response(account_activity(account_for_user(account_id, request.user)))

    def post(self, request, account_id):
        enterprise = account_for_user(account_id, request.user)
        action = create_action(enterprise, request.user, request.data)
        return Response(action_item(action), status=201)


class AccountActionDetailView(APIView):
    permission_classes = [IsKAMOrAdmin]

    def patch(self, request, account_id, action_id):
        enterprise = account_for_user(account_id, request.user)
        action = transition_action(enterprise, action_id, request.user, request.data)
        return Response(action_item(action))
