"""
URL configuration for BOM project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin as django_admin
from django.urls import include, path

from Admin import views as admin_views
from Corrdinator import views as coordinator_views
from EventMgnt.views import verify_page
from Registartion.views import registration_status


def home(request):
    from django.shortcuts import render

    return render(request, "public/index.html")

def syllabus_view(request):
    from django.shortcuts import render

    return render(request, "public/syllabus.html")

urlpatterns = [
    path("", home, name="home"),
    path("syllabus/", syllabus_view, name="syllabus"),
    path("syllabus.html", syllabus_view, name="syllabus_html"),
    path("django-admin/", django_admin.site.urls),
    path("account/", include("Account.urls")),
    path("coordinator/", include("Corrdinator.urls")),
    path("admin-control/", admin_views.admin_dashboard, name="admin_control"),
    path("admin.html", admin_views.admin_dashboard),
    path("signup.html", coordinator_views.coordinator_signup_page),
    path("coordinator-login.html", coordinator_views.coordinator_login_page),
    path("coordinator-dashboard.html", coordinator_views.coordinator_dashboard),
    path("result-view.html", coordinator_views.result_view),
    path("verify.html", verify_page),
    path("verify/", verify_page, name="verify"),

    path("api/public/registration-status", registration_status),
    path("api/coordinator/signup", coordinator_views.api_signup),
    path("api/coordinator/login", coordinator_views.api_login),
    path("api/coordinator/forgot-password", coordinator_views.api_forgot_password),
    path("api/coordinator/change-password", coordinator_views.api_change_password),
    path("api/coordinator/registration", coordinator_views.api_registration),
    path("api/coordinator/students", coordinator_views.api_students),
    path("api/coordinator/students/<int:index>", coordinator_views.api_students),
    path("api/coordinator/students/edit/<int:student_id>", coordinator_views.api_student_by_id),
    path("api/coordinator/payment", coordinator_views.api_payment),
    path("api/coordinator/student-results", coordinator_views.api_student_results),
    path("api/coordinator/admit-cards/download-all", coordinator_views.download_bulk_placeholder),
    path("api/coordinator/results/download-report-cards", coordinator_views.download_bulk_placeholder),
    path("api/coordinator/results/download-certificates", coordinator_views.download_bulk_placeholder),
    path("api/admin/results/download-report-card/<int:student_id>", coordinator_views.download_report_card),
    path("api/admin/results/download-certificate/<int:student_id>", coordinator_views.download_certificate),

    path("api/admin/login", admin_views.api_admin_login),
    path("api/admin/stats", admin_views.api_stats),
    path("api/admin/registrations", admin_views.api_registrations),
    path("api/admin/registrations/<str:registration_id>/status", admin_views.api_registration_status_update),
    path("api/admin/students", admin_views.api_students),
    path("api/admin/results/stats", admin_views.api_stats),
    path("api/admin/results/students", admin_views.api_students),
    path("api/admin/results/marks/<int:student_id>", admin_views.api_marks),
    path("api/admin/results/marks/batch", admin_views.api_marks),
    path("api/admin/edit/students", admin_views.api_students),
    path("api/admin/edit/students/<int:student_id>", admin_views.api_edit_student),
    path("api/admin/edit/students/batch", admin_views.api_edit_student),
    path("api/admin/registration-status", admin_views.api_registration_open),
    path("api/admin/admit-cards/stats", admin_views.api_stats),
    path("api/admin/admit-cards/release/<int:student_id>", admin_views.api_release_admit_card),
    path("api/admin/admit-cards/revoke/<int:student_id>", admin_views.api_release_admit_card),
    path("api/admin/admit-cards/release-all", admin_views.api_release_admit_card),
    path("api/admin/admit-cards/release-school/<int:school_id>", admin_views.api_release_admit_card),
    path("api/admin/export", admin_views.api_export),
    path("api/admin/export-students", admin_views.api_export),
    path("api/admin/schools", admin_views.api_schools),
    path("api/admin/send-message-to-coordinators", admin_views.api_send_message_to_coordinators),
    path("api/admin/results/release-report-cards", admin_views.api_publish_results),
    path("api/admin/results/release-certificates", admin_views.api_publish_results),
    path("api/admin/results/stop-report-cards", admin_views.api_unpublish_results),
    path("api/admin/results/stop-certificates", admin_views.api_unpublish_results),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
