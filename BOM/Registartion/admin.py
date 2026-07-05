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
    list_display = ("is_open", "event_year", "last_date_to_apply", "registration_fee_per_subject", "updated_at")
    fieldsets = (
        ("Registration status", {"fields": ("is_open", "results_published", "message")}),
        ("Event details", {"fields": ("event_year", "announcement_message", "handbook_url", "organizer_name", "organizer_link", "contact_whatsapp_url")}),
        ("Important dates", {"fields": ("last_date_to_apply", "admit_card_release_date", "english_exam_date", "english_exam_time", "computer_science_exam_date", "computer_science_exam_time", "mathematics_exam_date", "mathematics_exam_time", "science_exam_date", "science_exam_time", "result_declaration_date", "award_ceremony_date")}),
        ("Pricing and awards", {"fields": ("registration_fee_per_subject", "award_description")}),
    )
