from django.db.models import Q
from django.http import HttpResponse, JsonResponse

from Account.authentication import decode_access_token
from Account.decorators import get_token_from_request
from Account.models import User
from EventMgnt.pdf_utils import PdfGenerationError, clean_roll_number, generate_student_pdf
from Registartion.models import RegistrationSettings, Student


def _is_admin_requester(request):
    token = get_token_from_request(request)
    if token:
        try:
            payload = decode_access_token(token)
            if payload.get("role") == User.ADMIN:
                return True
            user = User.objects.filter(id=payload.get("user_id"), is_active=True).first()
            if user and (user.role == User.ADMIN or user.is_superuser):
                return True
        except Exception:
            pass
    if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
        if getattr(request.user, "role", None) == User.ADMIN or getattr(request.user, "is_superuser", False):
            return True
    return False


def registration_status(request):
    settings = RegistrationSettings.current()
    return JsonResponse(
        {
            "success": True,
            "data": {
                "isOpen": settings.is_open,
                "status": "open" if settings.is_open else "closed",
                "message": settings.message,
                "resultsPublished": settings.results_published,
                "eventYear": settings.event_year,
                "registrationFeePerSubject": settings.registration_fee_per_subject,
                "lastDateToApply": settings.last_date_to_apply.isoformat(),
            },
        }
    )


def api_public_student_result(request):
    settings = RegistrationSettings.current()
    if not settings.results_published and not _is_admin_requester(request):
        return JsonResponse(
            {"success": False, "message": "Results for Brain-O-Math Olympiad are not published yet."},
            status=403,
        )

    query = (
        request.GET.get("query")
        or request.GET.get("rollNumber")
        or request.GET.get("studentId")
        or ""
    ).strip()
    if not query:
        return JsonResponse(
            {"success": False, "message": "Please enter a Roll Number or Student ID."},
            status=400,
        )

    clean_q = clean_roll_number(query)
    student = (
        Student.objects.filter(
            Q(roll_number__iexact=query)
            | Q(roll_number__iexact=clean_q)
            | Q(student_id__iexact=query)
        )
        .select_related("coordinator", "coordinator__user")
        .first()
    )

    if not student:
        return JsonResponse(
            {
                "success": False,
                "message": f"No student found with Roll Number / ID '{query}'. Please verify and try again.",
            },
            status=404,
        )

    return JsonResponse(
        {
            "success": True,
            "data": {
                "id": student.id,
                "studentId": student.student_id,
                "name": student.name,
                "rollNumber": student.roll_number,
                "class": student.student_class,
                "category": student.category,
                "subjects": student.subjects,
                "schoolName": student.coordinator.school_name if student.coordinator else "",
                "marks": {
                    "english": student.english_marks,
                    "math": student.math_marks,
                    "science": student.science_marks,
                    "cs": student.cs_marks,
                },
            },
        }
    )


def api_public_download_report_card(request, student_id):
    settings = RegistrationSettings.current()
    if not settings.results_published and not _is_admin_requester(request):
        return JsonResponse(
            {"success": False, "message": "Results are not published yet."},
            status=403,
        )

    try:
        student = Student.objects.select_related("coordinator", "coordinator__user").get(id=student_id)
    except Student.DoesNotExist:
        return JsonResponse({"success": False, "message": "Student not found."}, status=404)

    try:
        pdf = generate_student_pdf(student, "report-card", request=request)
    except PdfGenerationError as exc:
        return JsonResponse(
            {"success": False, "message": "PDF generation failed.", "detail": str(exc)},
            status=500,
        )

    filename = f"ScoreCard-{clean_roll_number(student.roll_number) or student.student_id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def api_public_download_certificate(request, student_id):
    settings = RegistrationSettings.current()
    if not settings.results_published and not _is_admin_requester(request):
        return JsonResponse(
            {"success": False, "message": "Results are not published yet."},
            status=403,
        )

    try:
        student = Student.objects.select_related("coordinator", "coordinator__user").get(id=student_id)
    except Student.DoesNotExist:
        return JsonResponse({"success": False, "message": "Student not found."}, status=404)

    try:
        pdf = generate_student_pdf(student, "certificate", request=request)
    except PdfGenerationError as exc:
        return JsonResponse(
            {"success": False, "message": "PDF generation failed.", "detail": str(exc)},
            status=500,
        )

    filename = f"Certificate-{clean_roll_number(student.roll_number) or student.student_id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

