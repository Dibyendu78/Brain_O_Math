from django.urls import path

from Registartion import views


urlpatterns = [
    path("status/", views.registration_status, name="registration_status"),
]
