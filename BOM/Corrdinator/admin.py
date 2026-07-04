from django.contrib import admin

from Corrdinator.models import CoordinatorProfile


@admin.register(CoordinatorProfile)
class CoordinatorProfileAdmin(admin.ModelAdmin):
    list_display = ("school_name", "coordinator_name", "coordinator_phone", "is_verified", "created_at")
    search_fields = ("school_name", "coordinator_name", "user__email")
