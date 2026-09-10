from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import User, UserDevice

# La gestion des Groupes et Permissions Django est active pour le contrôle RBAC


class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'first_name', 'last_name', 'location', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active', 'location']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone', 'company_name']
    ordering = ['username']

    fieldsets = UserAdmin.fieldsets + (
        ('Informations Métier Onbora', {'fields': ('role', 'phone', 'company_name', 'location', 'kam_specialization', 'is_available', 'avatar')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations Métier Onbora', {'fields': ('role', 'phone', 'company_name', 'location', 'kam_specialization', 'is_available', 'avatar')}),
    )


admin.site.register(User, CustomUserAdmin)


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'device_type', 'device_name']
    list_filter = ['device_type']
    search_fields = ['user__username', 'device_name']
