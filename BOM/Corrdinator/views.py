import json
import re

from django.contrib.auth import authenticate
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from Account.decorators import jwt_required
from Account.models import User
from Account.views import issue_login_response, send_signup_credentials_email, send_payment_confirmation_email
from Corrdinator.models import CoordinatorProfile
from EventMgnt.pdf_utils import PdfGenerationError, clean_roll_number, generate_student_pdf
from Registartion.models import RegistrationPayment, RegistrationSettings, Student, class_to_category


def coordinator_signup_page(request):
    return render(request, "public/signup.html")


def coordinator_login_page(request):
    return render(request, "public/coordinator-login.html")


@jwt_required(roles=[User.COORDINATOR])
def coordinator_dashboard(request):
    return render(request, "public/coordinator-dashboard.html")


def result_view(request):
    return render(request, "public/result-view.html")


def _json_body(request):
    if request.body:
        try:
            return json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def _profile_dict(profile):
    return {
        "id": profile.id,
        "schoolName": profile.school_name,
        "schoolAddress": profile.school_address,
        "coordinatorName": profile.coordinator_name,
        "coordinatorEmail": profile.user.email,
        "coordinatorPhone": profile.coordinator_phone,
        "forcePasswordReset": profile.force_password_reset,
    }


def _student_dict(student, index=None):
    data = {
        "_id": str(student.id),
        "studentId": student.student_id,
        "name": student.name,
        "class": str(student.student_class),
        "category": student.category,
        "subjects": student.subjects,
        "venue": student.venue or "Doon Heritage School, Siliguri",
        "fee": student.fee,
        "parentName": student.parent_name,
        "parentContact": student.parent_contact,
        "rollNumber": student.roll_number,
        "admitCardReleased": student.admit_card_released,
        "marks": {
            "english": student.english_marks,
            "math": student.math_marks,
            "science": student.science_marks,
            "cs": student.cs_marks
        },
        "coordinatorName": student.coordinator.coordinator_name,
        "coordinatorEmail": student.coordinator.user.email,
        "schoolName": student.coordinator.school_name,
    }
    if index is not None:
        data["_idx"] = index
    return data


def _registration_payload(profile):
    students = list(profile.students.order_by("created_at", "id"))
    payment, _ = RegistrationPayment.objects.get_or_create(coordinator=profile)
    total = sum(student.fee for student in students)
    if payment.total_amount != total:
        payment.total_amount = total
        payment.save(update_fields=["total_amount", "updated_at"])
    return {
        "registrationId": payment.registration_id,
        "status": payment.status,
        "paymentStatus": payment.status,
        "venue": payment.venue or "Doon Heritage School, Siliguri",
        "utr": payment.utr,
        "totalAmount": total,
        "school": _profile_dict(profile),
        "students": [_student_dict(student, idx) for idx, student in enumerate(students)],
    }


@csrf_exempt
def api_signup(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    data = _json_body(request)
    required = ["schoolName", "schoolAddress", "coordinatorName", "coordinatorPhone", "coordinatorEmail", "password"]
    if any(not data.get(field) for field in required):
        return JsonResponse({"success": False, "message": "All fields are required"}, status=400)

    password = data.get("password", "")
    if len(password) < 6:
        return JsonResponse({"success": False, "message": "Password must be at least 6 characters"}, status=400)

    email = data["coordinatorEmail"].strip().lower()
    phone = re.sub(r"\D", "", data["coordinatorPhone"])
    if len(phone) != 10:
        return JsonResponse({"success": False, "message": "Phone number must be 10 digits"}, status=400)
    if User.objects.filter(email=email).exists():
        return JsonResponse({"success": False, "message": "Email already registered"}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=data["coordinatorName"].strip().split(" ")[0],
        last_name=" ".join(data["coordinatorName"].strip().split(" ")[1:]) or "",
        role=User.COORDINATOR,
        is_active=True,
    )
    profile = CoordinatorProfile.objects.create(
        user=user,
        school_name=data["schoolName"].strip(),
        school_address=data["schoolAddress"].strip(),
        coordinator_name=data["coordinatorName"].strip(),
        coordinator_phone=phone,
    )
    RegistrationPayment.objects.create(coordinator=profile)
    send_signup_credentials_email(request, user, password)
    return JsonResponse(
        {
            "success": True,
            "message": "Account created successfully.",
            "coordinator": _profile_dict(profile),
        }
    )


@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    data = _json_body(request)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    user = authenticate(request, username=email, password=password)
    if not user:
        return JsonResponse({"success": False, "message": "Invalid email or password"}, status=401)
        
    if user.is_superuser or user.role == User.ADMIN:
        response = issue_login_response(request, user, "/admin-control/")
        return response
        
    if user.role != User.COORDINATOR:
        return JsonResponse({"success": False, "message": "Invalid email or password"}, status=401)

    response = issue_login_response(request, user, "/coordinator/dashboard/")
    payload = json.loads(response.content.decode("utf-8"))
    payload["coordinator"] = _profile_dict(user.coordinator_profile)
    response.content = json.dumps(payload).encode("utf-8")
    return response


@csrf_exempt
def api_forgot_password(request):
    from django.utils.crypto import get_random_string
    from Account.views import send_html_email

    data = _json_body(request)
    email = data.get("email", "").strip().lower()
    try:
        user = User.objects.get(email=email, role=User.COORDINATOR)
    except User.DoesNotExist:
        return JsonResponse({"success": False, "message": "Coordinator not found"}, status=404)
    
    new_password = get_random_string(length=8)
    user.set_password(new_password)
    user.coordinator_profile.force_password_reset = True
    user.coordinator_profile.save(update_fields=["force_password_reset"])
    user.save(update_fields=["password"])
    
    send_html_email(
        request,
        "Your new Brain-O-Math password",
        "account/email/password_reset_email.html",
        {
            "user": user,
            "password": new_password,
            "login_url": f"{'https' if request.is_secure() else 'http'}://{request.get_host()}/coordinator/login/",
        },
        [user.email],
    )
    
    return JsonResponse({"success": True, "message": "A new password has been sent to your registered email address."})


@jwt_required(roles=[User.COORDINATOR])
@csrf_exempt
def api_change_password(request):
    data = _json_body(request)
    new_password = data.get("newPassword", "")
    confirm_password = data.get("confirmPassword", "")

    if len(new_password) < 6:
        return JsonResponse({"success": False, "message": "Password must be at least 6 characters long"}, status=400)
    
    if new_password != confirm_password:
        return JsonResponse({"success": False, "message": "Passwords do not match"}, status=400)

    user = request.user
    user.set_password(new_password)
    user.save(update_fields=["password"])

    if hasattr(user, 'coordinator_profile'):
        user.coordinator_profile.force_password_reset = False
        user.coordinator_profile.save(update_fields=["force_password_reset"])

    return JsonResponse({"success": True, "message": "Password updated successfully"})


@jwt_required(roles=[User.COORDINATOR])
def api_registration(request):
    return JsonResponse({"success": True, "data": _registration_payload(request.user.coordinator_profile), **_profile_dict(request.user.coordinator_profile)})


@csrf_exempt
@jwt_required(roles=[User.COORDINATOR])
def api_students(request, index=None):
    profile = request.user.coordinator_profile
    students = list(profile.students.order_by("created_at", "id"))
    payment, _ = RegistrationPayment.objects.get_or_create(coordinator=profile)

    if request.method == "POST":
        if payment.status in {"submitted", "verified"}:
            return JsonResponse({"success": False, "message": "Registration is locked after UTR submission"}, status=403)
        student = _save_student(profile, _json_body(request))
        return JsonResponse({"success": True, "data": _student_dict(student)})

    if index is None:
        return JsonResponse({"success": True, "data": [_student_dict(student, i) for i, student in enumerate(students)]})

    try:
        student = students[int(index)]
    except (ValueError, IndexError):
        return JsonResponse({"success": False, "message": "Student not found"}, status=404)

    if request.method == "PUT":
        if payment.status in {"submitted", "verified"}:
            return JsonResponse({"success": False, "message": "Registration is locked after UTR submission"}, status=403)
        student = _save_student(profile, _json_body(request), student)
        return JsonResponse({"success": True, "data": _student_dict(student)})

    if request.method == "DELETE":
        if payment.status in {"submitted", "verified"}:
            return JsonResponse({"success": False, "message": "Registration is locked after UTR submission"}, status=403)
        student.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "Invalid method"}, status=405)


@csrf_exempt
@jwt_required(roles=[User.COORDINATOR])
def api_student_by_id(request, student_id):
    try:
        student = request.user.coordinator_profile.students.get(id=student_id)
    except Student.DoesNotExist:
        return JsonResponse({"success": False, "message": "Student not found"}, status=404)
    if request.method != "PUT":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)
    student = _save_student(request.user.coordinator_profile, _json_body(request), student)
    return JsonResponse({"success": True, "data": _student_dict(student)})


def _save_student(profile, data, student=None):
    student = student or Student(coordinator=profile)
    student.name = data.get("name", "").strip()
    student.student_class = int(data.get("class") or data.get("student_class") or 0)
    student.subjects = data.get("subjects", "")
    student.category = data.get("category") or class_to_category(student.student_class)
    student.parent_name = data.get("parentName", "").strip()
    student.parent_contact = data.get("parentContact", "").strip()
    payment, _ = RegistrationPayment.objects.get_or_create(coordinator=profile)
    student.venue = data.get("venue") or payment.venue or "Doon Heritage School, Siliguri"
    student.save()
    return student


@csrf_exempt
@jwt_required(roles=[User.COORDINATOR])
def api_payment(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)
    data = _json_body(request)
    utr = str(data.get("utr", "")).strip()
    if not utr.isdigit() or len(utr) != 12:
        return JsonResponse({"success": False, "message": "UTR must be 12 digits"}, status=400)
    venue = str(data.get("venue", "")).strip()
    valid_venues = ["Doon Heritage School, Siliguri", "Don Bosco School, Mayanaguri"]
    if venue not in valid_venues:
        return JsonResponse({"success": False, "message": "Please select a valid venue option (Doon Heritage School, Siliguri or Don Bosco School, Mayanaguri)"}, status=400)
    profile = request.user.coordinator_profile
    payment, _ = RegistrationPayment.objects.get_or_create(coordinator=profile)
    payment.utr = utr
    payment.venue = venue
    payment.status = "submitted"
    payment.total_amount = sum(student.fee for student in profile.students.all())
    payment.submitted_at = timezone.now()
    payment.save()
    profile.students.update(venue=venue)
    send_payment_confirmation_email(request, profile, payment)
    return JsonResponse({"success": True, "data": {"utr": payment.utr, "registrationId": payment.registration_id, "venue": payment.venue}})


@jwt_required(roles=[User.COORDINATOR])
def api_student_results(request):
    settings = RegistrationSettings.current()
    if not settings.results_published:
        return JsonResponse({"success": False, "message": "Results are not published yet."}, status=403)
    students = request.user.coordinator_profile.students.order_by("student_class", "name")
    return JsonResponse({"success": True, "data": [_student_dict(student) for student in students]})


@jwt_required(roles=[User.COORDINATOR, User.ADMIN])
def download_report_card(request, student_id):
    return _download_student_pdf(request, student_id, "report-card", "score-card")


@jwt_required(roles=[User.COORDINATOR, User.ADMIN])
def download_certificate(request, student_id):
    return _download_student_pdf(request, student_id, "certificate", "certificate")


@jwt_required(roles=[User.COORDINATOR, User.ADMIN])
def download_admit_card(request, student_id):
    return _download_student_pdf(request, student_id, "admit-card", "admit-card")


@jwt_required(roles=[User.COORDINATOR])
def download_bulk_placeholder(request):
    return JsonResponse(
        {
            "success": False,
            "message": "Bulk PDF ZIP generation is not configured yet. Download one student at a time.",
        },
        status=501,
    )


def _download_student_pdf(request, student_id, kind, label):
    try:
        if request.user.role == User.ADMIN:
            student = Student.objects.select_related("coordinator", "coordinator__user").get(id=student_id)
        else:
            student = request.user.coordinator_profile.students.get(id=student_id)
    except Student.DoesNotExist:
        return JsonResponse({"success": False, "message": "Student not found"}, status=404)

    if kind == "admit-card" and request.user.role != User.ADMIN and not student.admit_card_released:
        return JsonResponse({"success": False, "message": "Admit card is not released yet."}, status=403)

    try:
        pdf = generate_student_pdf(student, kind, request=request)
    except PdfGenerationError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": "PDF generation failed. Ensure Node dependency `pdfkit` is installed.",
                "detail": str(exc),
            },
            status=500,
        )

    filename = f"{label}-{clean_roll_number(student.roll_number) or student.student_id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
