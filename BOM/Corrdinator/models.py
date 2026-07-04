from django.conf import settings
from django.db import models


class CoordinatorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coordinator_profile")
    school_name = models.CharField(max_length=255)
    school_address = models.TextField()
    coordinator_name = models.CharField(max_length=255)
    coordinator_phone = models.CharField(max_length=10)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.school_name} - {self.coordinator_name}"
