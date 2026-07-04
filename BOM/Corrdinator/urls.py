from django.urls import path

from Corrdinator import views


urlpatterns = [
    path("signup/", views.coordinator_signup_page, name="coordinator_signup"),
    path("login/", views.coordinator_login_page, name="coordinator_login"),
    path("dashboard/", views.coordinator_dashboard, name="coordinator_dashboard"),
    path("results/", views.result_view, name="result_view"),
]
