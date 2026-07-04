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


def send_results_published_email(request, profile):
    students = profile.students.order_by("student_class", "name")
    send_html_email(
        request,
        "Results are published",
        "account/email/results_published_email.html",
        {
            "coordinator_name": profile.coordinator_name,
            "school_name": profile.school_name,
            "email": profile.user.email,
            "dashboard_url": f"{'https' if request.is_secure() else 'http'}://{request.get_host()}/coordinator/dashboard/",
            "students": [
                {
                    "student_id": student.student_id,
                    "name": student.name,
                    "student_class": student.student_class,
                    "subjects": student.subjects,
                    "roll_number": student.roll_number,
                    "math_marks": student.math_marks,
                    "science_marks": student.science_marks,
                }
                for student in students
            ],
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
