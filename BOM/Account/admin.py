from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from Account.models import User, UserToken


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Brain-O-Math", {"fields": ("role",)}),)
    list_display = ("email", "username", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")


@admin.register(UserToken)
class UserTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expired_at")
    search_fields = ("user__email", "token")
