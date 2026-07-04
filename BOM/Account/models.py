from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ADMIN = "admin"
    COORDINATOR = "coordinator"
    STUDENT = "student"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (COORDINATOR, "Coordinator"),
        (STUDENT, "Student"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=COORDINATOR)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    def __str__(self):
        return self.email


class UserToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tokens")
    token = models.CharField(max_length=500, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expired_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.email} token"
