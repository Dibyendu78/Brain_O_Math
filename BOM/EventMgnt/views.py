import base64
import json

from django.shortcuts import get_object_or_404, render

from Registartion.models import Student


def verify_page(request):
    student_id = request.GET.get("student")
    if student_id and not request.GET.get("data"):
        student = get_object_or_404(Student, student_id=student_id)
        payload = {
            "name": student.name,
            "studentId": student.student_id,
            "rollNumber": student.roll_number,
            "class": student.student_class,
            "category": student.category,
            "subjects": student.subjects,
            "schoolName": student.coordinator.school_name,
            "coordinatorName": student.coordinator.coordinator_name,
            "coordinatorEmail": student.coordinator.user.email,
            "registrationId": getattr(student.coordinator, "payment", None).registration_id if hasattr(student.coordinator, "payment") else "",
        }
        encoded = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii").rstrip("=")
        request.GET = request.GET.copy()
        request.GET["data"] = encoded
    return render(request, "public/verify.html")
