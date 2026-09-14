from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Accès réservé exclusivement aux Administrateurs généraux Onbora.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'ADMIN' or request.user.is_superuser

class IsKAMManager(permissions.BasePermission):
    """
    Accès réservé exclusivement aux Directeurs / Gérants du KAM Office (Direction Grands Comptes) et Admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['KAM_MANAGER', 'ADMIN'] or request.user.is_superuser

class IsSupervisor(permissions.BasePermission):
    """
    Accès réservé aux Superviseurs Back-Office Terrain et Admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['SUPERVISOR', 'ADMIN'] or request.user.is_superuser

class IsKAM(permissions.BasePermission):
    """
    Accès réservé à l'entité Grands Comptes (KAM, Gérants KAM & Admins).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['KAM', 'KAM_MANAGER', 'ADMIN'] or request.user.is_superuser

class IsKAMOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['KAM', 'KAM_MANAGER', 'ADMIN'] or request.user.is_superuser

class IsSupervisorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['SUPERVISOR', 'ADMIN'] or request.user.is_superuser

class IsSalesperson(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['SALESPERSON', 'SUPERVISOR', 'ADMIN'] or request.user.is_superuser

class IsSalespersonOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['SALESPERSON', 'SUPERVISOR', 'ADMIN'] or request.user.is_superuser

class IsClientOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['CLIENT_B2B', 'ADMIN'] or request.user.is_superuser
