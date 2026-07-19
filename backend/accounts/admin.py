from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'company_name', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Onbora', {'fields': ('role', 'phone', 'company_name')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations Onbora', {'fields': ('role', 'phone', 'company_name')}),
    )

admin.site.register(User, CustomUserAdmin)
