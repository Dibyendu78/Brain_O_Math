from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from Account.authentication import create_access_token, create_refresh_token
from Account.decorators import jwt_required
from Account.models import User, UserToken


def activate(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save(update_fields=["is_active"])
        return redirect("coordinator_login")
    return render(request, "public/verify.html", status=400)


def send_verification_email(request, user, subject="Activate your Brain-O-Math account"):
    message = render_to_string(
        "account/email/account_verification_email.html",
        {
            "user": user,
            "domain": request.get_host(),
            "scheme": "https" if request.is_secure() else "http",
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        },
    )
    mail = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    mail.content_subtype = "html"
    mail.send(fail_silently=True)


def send_html_email(request, subject, template_name, context, recipient_list):
    message = render_to_string(template_name, context)
    mail = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list)
    mail.content_subtype = "html"
    mail.send(fail_silently=True)


def send_signup_credentials_email(request, user, password):
    send_html_email(
        request,
        "Your Brain-O-Math login details",
        "account/email/signup_credentials_email.html",
        {
            "user": user,
            "password": password,
            "login_url": f"{'https' if request.is_secure() else 'http'}://{request.get_host()}/coordinator/login/",
        },
        [user.email],
    )


def send_payment_confirmation_email(request, profile, payment):
    students = profile.students.order_by("student_class", "name")
    send_html_email(
        request,
        "Payment submitted successfully",
        "account/email/payment_confirmation_email.html",
        {
            "coordinator_name": profile.coordinator_name,
            "school_name": profile.school_name,
            "email": profile.user.email,
            "registration_id": payment.registration_id,
            "utr": payment.utr,
            "total_amount": payment.total_amount,
            "submitted_at": payment.submitted_at,
            "login_url": f"{'https' if request.is_secure() else 'http'}://{request.get_host()}/coordinator/login/",
            "students": [
                {
                    "student_id": student.student_id,
                    "name": student.name,
                    "student_class": student.student_class,
                    "subjects": student.subjects,
                    "fee": student.fee,
                }
                for student in students
            ],
        },
        [profile.user.email],
    )


def send_results_published_email(request, profile, venue=None):
    students = profile.students.all()
    if venue:
        venue_str = str(venue).strip()
        from django.db.models import Q
        students_filtered = students.filter(
            Q(venue__iexact=venue_str) |
            Q(coordinator__payment__venue__iexact=venue_str)
        )
        if students_filtered.exists():
            students = students_filtered
    students = students.order_by("student_class", "name")
    if not students.exists():
        return

    try:
        host = request.get_host()
    except Exception:
        host = "brainomath.online"

    student_data = []
    for student in students:
        active_subs = [s.strip().lower() for s in (student.subjects or "").split(",") if s.strip()]

        def format_mark(sub_code, mark):
            if sub_code in active_subs or mark is not None:
                return str(mark) if mark is not None else "-"
            return "N/A"

        eng_disp = format_mark("english", student.english_marks)
        math_disp = format_mark("math", student.math_marks)
        sci_disp = format_mark("science", student.science_marks)
        cs_disp = format_mark("cs", student.cs_marks)

        valid_marks = [m for m in [student.english_marks, student.math_marks, student.science_marks, student.cs_marks] if m is not None]
        if valid_marks:
            tot = sum(valid_marks)
            max_tot = len(valid_marks) * 60
            pct = f"{round((tot / max_tot) * 100, 1)}%"
            tot_disp = f"{tot}/{max_tot}"
        else:
            tot_disp = "-"
            pct = "-"

        student_data.append({
            "student_id": student.student_id,
            "name": student.name,
            "student_class": student.student_class,
            "subjects": student.subjects,
            "roll_number": student.roll_number or "-",
            "english_marks": student.english_marks,
            "math_marks": student.math_marks,
            "science_marks": student.science_marks,
            "cs_marks": student.cs_marks,
            "english_display": eng_disp,
            "math_display": math_disp,
            "science_display": sci_disp,
            "cs_display": cs_disp,
            "total_marks": tot_disp,
            "percentage": pct,
        })

    send_html_email(
        request,
        "Brain-O-Math Olympiad - Results Declared",
        "account/email/results_published_email.html",
        {
            "coordinator_name": profile.coordinator_name,
            "school_name": profile.school_name,
            "email": profile.user.email,
            "dashboard_url": f"https://{host}/coordinator/dashboard/",
            "students": student_data,
        },
        [profile.user.email],
    )



def issue_login_response(request, user, redirect_url="/"):
    login(request, user)
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    UserToken.objects.create(
        user=user,
        token=refresh_token,
        expired_at=timezone.now() + timedelta(days=7),
    )
    response = JsonResponse({"success": True, "status": "success", "token": access_token, "redirect_url": redirect_url})
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="Lax", max_age=2400, path="/")
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )
    return response


def account_login(request):
    if request.method == "GET":
        return render(request, "public/coordinator-login.html")

    email = request.POST.get("email", "").strip()
    password = request.POST.get("password", "")
    user = authenticate(request, username=email, password=password)
    if not user:
        return JsonResponse({"success": False, "message": "Invalid credentials"}, status=401)
    if not user.is_active:
        return JsonResponse({"success": False, "message": "Please verify your email before logging in."}, status=403)
    return issue_login_response(request, user, "/coordinator/dashboard/")


@jwt_required
def account_logout(request):
    refresh_token = request.COOKIES.get("refresh_token")
    if refresh_token:
        UserToken.objects.filter(user=request.user, token=refresh_token).delete()
    logout(request)
    response = redirect("home")
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response
