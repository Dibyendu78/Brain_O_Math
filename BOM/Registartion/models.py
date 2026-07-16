import uuid
from datetime import date

from django.db import models

from Corrdinator.models import CoordinatorProfile


class RegistrationSettings(models.Model):
    is_open = models.BooleanField(default=True)
    results_published = models.BooleanField(default=False)
    message = models.CharField(max_length=255, blank=True, default="")
    event_year = models.PositiveIntegerField(default=2026)
    announcement_message = models.CharField(max_length=255, blank=True, default="Registration is now open for Brain-O-Math Olympiad 2026.")
    last_date_to_apply = models.DateField(default=date(2026, 8, 2))
    admit_card_release_date = models.DateField(default=date(2026, 8, 4))
    english_exam_date = models.DateField(default=date(2026, 8, 8))
    english_exam_time = models.CharField(max_length=50, default="1:00 PM – 2:00 PM")
    computer_science_exam_date = models.DateField(default=date(2026, 8, 8))
    computer_science_exam_time = models.CharField(max_length=50, default="2:30 PM – 3:30 PM")
    mathematics_exam_date = models.DateField(default=date(2026, 8, 8))
    mathematics_exam_time = models.CharField(max_length=50, default="9:30 AM – 10:30 AM")
    science_exam_date = models.DateField(default=date(2026, 8, 8))
    science_exam_time = models.CharField(max_length=50, default="11:00 AM – 12:00 PM")
    result_declaration_date = models.DateField(default=date(2026, 10, 1))
    award_ceremony_date = models.DateField(default=date(2026, 10, 6))
    registration_fee_per_subject = models.PositiveIntegerField(default=100)
    award_description = models.CharField(max_length=255, default="Silver Medal for the highest scorer in any one subject.")
    handbook_url = models.URLField(default="https://drive.google.com/file/d/15I5Cd6Hp384KRoHtcxUBXFJIl7fVvr51/view?usp=drive_link")
    organizer_name = models.CharField(max_length=255, default="Doon Heritage School, Siliguri")
    organizer_link = models.URLField(default="https://www.doonheritageschool.co.in")
    contact_whatsapp_url = models.URLField(default="https://wa.me/917384687034?text=Hi%20I%27d%20like%20to%20know%20more%20about%20Brain-O-Math.")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Open" if self.is_open else "Closed"

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                "is_open": True,
                "event_year": 2026,
                "last_date_to_apply": date(2026, 8, 2),
                "admit_card_release_date": date(2026, 8, 4),
                "english_exam_date": date(2026, 8, 8),
                "english_exam_time": "1:00 PM – 2:00 PM",
                "computer_science_exam_date": date(2026, 8, 8),
                "computer_science_exam_time": "2:30 PM – 3:30 PM",
                "mathematics_exam_date": date(2026, 8, 8),
                "mathematics_exam_time": "9:30 AM – 10:30 AM",
                "science_exam_date": date(2026, 8, 8),
                "science_exam_time": "11:00 AM – 12:00 PM",
                "result_declaration_date": date(2026, 10, 1),
                "award_ceremony_date": date(2026, 10, 6),
                "registration_fee_per_subject": 100,
                "award_description": "Silver Medal for the highest scorer in any one subject.",
                "handbook_url": "https://drive.google.com/file/d/15I5Cd6Hp384KRoHtcxUBXFJIl7fVvr51/view?usp=drive_link",
                "organizer_name": "Doon Heritage School, Siliguri",
                "organizer_link": "https://www.doonheritageschool.co.in",
                "contact_whatsapp_url": "https://wa.me/917384687034?text=Hi%20I%27d%20like%20to%20know%20more%20about%20Brain-O-Math.",
            },
        )
        return obj


class Student(models.Model):
    SUBJECT_CHOICES = [
        ("english", "English"),
        ("math", "Mathematics"),
        ("science", "Science"),
        ("cs", "Computer Science"),
    ]

    coordinator = models.ForeignKey(CoordinatorProfile, on_delete=models.CASCADE, related_name="students")
    student_id = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=255)
    student_class = models.PositiveSmallIntegerField()
    category = models.CharField(max_length=1)
    subjects = models.CharField(max_length=50, help_text="Comma-separated subject codes (english,math,science,cs)")
    fee = models.PositiveIntegerField(default=100)
    parent_name = models.CharField(max_length=255, blank=True)
    parent_contact = models.CharField(max_length=10, blank=True)
    roll_number = models.CharField(max_length=30, blank=True)
    admit_card_released = models.BooleanField(default=False)
    english_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    math_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    science_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    cs_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.student_id:
            self.student_id = f"BOM{uuid.uuid4().hex[:8].upper()}"
        if not self.category:
            self.category = class_to_category(self.student_class)
        if self.subjects:
            subject_count = len([s.strip() for s in self.subjects.split(',') if s.strip()])
            settings = RegistrationSettings.current()
            self.fee = subject_count * settings.registration_fee_per_subject
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_id} - {self.name}"


class RegistrationPayment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("submitted", "Submitted"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    coordinator = models.OneToOneField(CoordinatorProfile, on_delete=models.CASCADE, related_name="payment")
    registration_id = models.CharField(max_length=30, unique=True, blank=True)
    utr = models.CharField(max_length=12, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_amount = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.registration_id:
            self.registration_id = f"REG{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.registration_id} - {self.coordinator.school_name}"


def class_to_category(value):
    cls = int(value)
    if 3 <= cls <= 4:
        return "A"
    if 5 <= cls <= 6:
        return "B"
    if 7 <= cls <= 8:
        return "C"
    if 9 <= cls <= 10:
        return "D"
    return "E"
