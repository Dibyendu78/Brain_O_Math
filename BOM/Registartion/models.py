import uuid

from django.db import models

from Corrdinator.models import CoordinatorProfile


class RegistrationSettings(models.Model):
    is_open = models.BooleanField(default=True)
    results_published = models.BooleanField(default=False)
    message = models.CharField(max_length=255, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Open" if self.is_open else "Closed"

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={"is_open": True})
        return obj


class Student(models.Model):
    SUBJECT_CHOICES = [
        ("math", "Mathematics"),
        ("science", "Science"),
        ("both", "Math & Science"),
    ]

    coordinator = models.ForeignKey(CoordinatorProfile, on_delete=models.CASCADE, related_name="students")
    student_id = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=255)
    student_class = models.PositiveSmallIntegerField()
    category = models.CharField(max_length=1)
    subjects = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    fee = models.PositiveIntegerField(default=70)
    parent_name = models.CharField(max_length=255, blank=True)
    parent_contact = models.CharField(max_length=10, blank=True)
    roll_number = models.CharField(max_length=30, blank=True)
    admit_card_released = models.BooleanField(default=False)
    math_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    science_marks = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.student_id:
            self.student_id = f"BOM{uuid.uuid4().hex[:8].upper()}"
        if not self.category:
            self.category = class_to_category(self.student_class)
        self.fee = 140 if self.subjects == "both" else 70
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
