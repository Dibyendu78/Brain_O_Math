import csv
import json

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from Account.decorators import jwt_required
from Account.models import User
from Account.views import issue_login_response, send_results_published_email
from Corrdinator.models import CoordinatorProfile
from Corrdinator.views import _profile_dict, _student_dict
from Registartion.models import RegistrationPayment, RegistrationSettings, Student


def admin_login_page(request):
    return render(request, "public/admin-login.html")


@jwt_required(roles=[User.ADMIN])
def admin_dashboard(request):
    return render(request, "public/admin.html")


def _body(request):
    if request.body:
        try:
            return json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def _payment_dict(payment):
    profile = payment.coordinator
    students = list(profile.students.order_by("created_at"))
    return {
        "_id": payment.id,
        "registrationId": payment.registration_id,
        "status": payment.status,
        "paymentStatus": payment.status,
        "utr": payment.utr,
        "totalAmount": payment.total_amount,
        "school": _profile_dict(profile),
        "students": [_student_dict(student) for student in students],
        "createdAt": payment.submitted_at.isoformat() if payment.submitted_at else "",
    }


@csrf_exempt
def api_admin_login(request):
    data = _body(request)
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = authenticate(request, username=username, password=password)
    if not user:
        try:
            email_user = User.objects.get(username=username)
            user = authenticate(request, username=email_user.email, password=password)
        except User.DoesNotExist:
            user = None
    if not user or (user.role != User.ADMIN and not user.is_superuser):
        return JsonResponse({"success": False, "message": "Invalid admin credentials"}, status=401)
    if not user.is_active:
        return JsonResponse({"success": False, "message": "Admin account is inactive"}, status=403)
    return issue_login_response(request, user, "/admin-control/")


@jwt_required(roles=[User.ADMIN])
def api_stats(request):
    payments = RegistrationPayment.objects.all()
    return JsonResponse(
        {
            "success": True,
            "data": {
                "totalRegistrations": payments.count(),
                "totalStudents": Student.objects.count(),
                "totalRevenue": sum(payment.total_amount for payment in payments.filter(status="verified")),
            },
        }
    )


@jwt_required(roles=[User.ADMIN])
def api_registrations(request):
    status = request.GET.get("status")
    payments = RegistrationPayment.objects.select_related("coordinator", "coordinator__user").order_by("-updated_at")
    if status:
        payments = payments.filter(status=status)
    return JsonResponse({"success": True, "data": [_payment_dict(payment) for payment in payments], "pagination": {"total": payments.count(), "page": 1}})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_registration_status_update(request, registration_id):
    data = _body(request)
    status = data.get("status")
    if status not in {"pending", "submitted", "verified", "rejected"}:
        return JsonResponse({"success": False, "message": "Invalid status"}, status=400)
    try:
        payment = RegistrationPayment.objects.get(registration_id=registration_id)
    except RegistrationPayment.DoesNotExist:
        return JsonResponse({"success": False, "message": "Registration not found"}, status=404)
    payment.status = status
    payment.save(update_fields=["status", "updated_at"])
    return JsonResponse({"success": True, "data": _payment_dict(payment)})


@jwt_required(roles=[User.ADMIN])
def api_students(request):
    qs = Student.objects.select_related("coordinator", "coordinator__user").order_by("student_class", "name")
    cls = request.GET.get("class")
    if cls:
        qs = qs.filter(student_class=cls)
    data = []
    for student in qs:
        item = _student_dict(student)
        item["school"] = _profile_dict(student.coordinator)
        data.append(item)
    return JsonResponse({"success": True, "data": data, "pagination": {"total": qs.count(), "page": 1}})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_marks(request, student_id=None):
    data = _body(request)
    if student_id:
        students = [
            {
                "studentId": student_id,
                "englishMarks": data.get("englishMarks"),
                "mathMarks": data.get("mathMarks"),
                "scienceMarks": data.get("scienceMarks"),
                "csMarks": data.get("csMarks"),
            }
        ]
    else:
        students = data.get("students", [])

    success_count = 0
    for row in students:
        try:
            student = Student.objects.get(id=row.get("studentId"))
        except Student.DoesNotExist:
            continue
        student.english_marks = _optional_int(row.get("englishMarks"))
        student.math_marks = _optional_int(row.get("mathMarks"))
        student.science_marks = _optional_int(row.get("scienceMarks"))
        student.cs_marks = _optional_int(row.get("csMarks"))
        student.save(update_fields=["english_marks", "math_marks", "science_marks", "cs_marks", "updated_at"])
        success_count += 1
    return JsonResponse(
        {
            "success": True,
            "data": {
                "successCount": success_count,
                "total": len(students),
                "failureCount": len(students) - success_count,
            },
        }
    )


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_edit_student(request, student_id=None):
    data = _body(request)
    rows = data.get("students", [{"studentId": student_id, "name": data.get("name")}])
    success_count = 0
    for row in rows:
        try:
            student = Student.objects.get(id=row.get("studentId"))
        except Student.DoesNotExist:
            continue
        student.name = (row.get("name") or student.name).strip()
        student.save(update_fields=["name", "updated_at"])
        success_count += 1
    return JsonResponse({"success": True, "data": {"successCount": success_count, "total": len(rows), "failureCount": len(rows) - success_count}})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_registration_open(request):
    settings = RegistrationSettings.current()
    if request.method in {"POST", "PUT"}:
        data = _body(request)
        if "status" in data:
            settings.is_open = data["status"] == "open"
        if "isOpen" in data:
            settings.is_open = bool(data["isOpen"])
        if "message" in data:
            settings.message = data["message"]
        settings.save()
    return JsonResponse(
        {
            "success": True,
            "data": {
                "isOpen": settings.is_open,
                "status": "open" if settings.is_open else "closed",
                "message": settings.message,
                "resultsPublished": settings.results_published,
            },
        }
    )


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_publish_results(request):
    settings = RegistrationSettings.current()
    was_published = settings.results_published
    settings.results_published = True
    settings.save(update_fields=["results_published", "updated_at"])
    if not was_published:
        for profile in CoordinatorProfile.objects.select_related("user").all():
            if profile.user and profile.user.email:
                send_results_published_email(request, profile)
    return JsonResponse({"success": True, "message": "Results published successfully.", "data": {"resultsPublished": settings.results_published}})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_unpublish_results(request):
    settings = RegistrationSettings.current()
    settings.results_published = False
    settings.save(update_fields=["results_published", "updated_at"])
    return JsonResponse({"success": True, "message": "Results hidden successfully.", "data": {"resultsPublished": settings.results_published}})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_release_admit_card(request, student_id=None, school_id=None):
    if student_id:
        qs = Student.objects.filter(id=student_id)
    elif school_id:
        qs = Student.objects.filter(coordinator_id=school_id)
    else:
        qs = Student.objects.all()
    released = 0
    for student in qs:
        if not student.roll_number:
            student.roll_number = f"BOM-{student.student_class}-{student.id:04d}"
        student.admit_card_released = "revoke" not in request.path
        student.save(update_fields=["roll_number", "admit_card_released", "updated_at"])
        released += 1
    return JsonResponse({"success": True, "data": {"released": released}})


@jwt_required(roles=[User.ADMIN])
def api_export(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="brain-o-math-export.csv"'
    writer = csv.writer(response)
    writer.writerow(["Registration ID", "School", "Coordinator", "Email", "Students", "Amount", "Status", "UTR"])
    for payment in RegistrationPayment.objects.select_related("coordinator", "coordinator__user"):
        writer.writerow([
            payment.registration_id,
            payment.coordinator.school_name,
            payment.coordinator.coordinator_name,
            payment.coordinator.user.email,
            payment.coordinator.students.count(),
            payment.total_amount,
            payment.status,
            payment.utr,
        ])
    return response


def _optional_int(value):
    if value in ("", None):
        return None
    return int(value)


@jwt_required(roles=[User.ADMIN])
def api_schools(request):
    return JsonResponse({"success": True, "data": [_profile_dict(profile) for profile in CoordinatorProfile.objects.all()]})


@csrf_exempt
@jwt_required(roles=[User.ADMIN])
def api_send_message_to_coordinators(request):
    data = _body(request)
    message_content = data.get("message", "").strip()
    
    if not message_content:
        return JsonResponse({"success": False, "message": "Message cannot be empty"}, status=400)
    
    coordinators = CoordinatorProfile.objects.select_related("user").all()
    success_count = 0
    
    for profile in coordinators:
        if profile.user and profile.user.email:
            try:
                send_mail(
                    "Message from Brain-O-Math Admin",
                    message_content,
                    settings.DEFAULT_FROM_EMAIL,
                    [profile.user.email],
                    fail_silently=True,
                )
                success_count += 1
            except Exception as e:
                print(f"Error sending email to {profile.user.email}: {e}")
                
    return JsonResponse({"success": True, "data": {"successCount": success_count}})
