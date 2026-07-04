from django.contrib import admin

from Registartion.models import RegistrationPayment, RegistrationSettings, Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("student_id", "name", "student_class", "subjects", "coordinator", "roll_number", "admit_card_released")
    list_filter = ("student_class", "subjects", "category", "admit_card_released")
    search_fields = ("student_id", "name", "coordinator__school_name")


@admin.register(RegistrationPayment)
class RegistrationPaymentAdmin(admin.ModelAdmin):
    list_display = ("registration_id", "coordinator", "utr", "status", "total_amount", "submitted_at")
    list_filter = ("status",)
    search_fields = ("registration_id", "utr", "coordinator__school_name")


@admin.register(RegistrationSettings)
class RegistrationSettingsAdmin(admin.ModelAdmin):
    list_display = ("is_open", "message", "updated_at")
