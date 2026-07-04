from django.urls import path

from Admin import views


urlpatterns = [
    path("login/", views.admin_login_page, name="admin_login"),
    path("dashboard/", views.admin_dashboard, name="admin_dashboard"),
]
