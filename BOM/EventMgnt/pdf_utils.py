import json
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings


ROOT_DIR = settings.BASE_DIR.parent
PDF_BRIDGE = ROOT_DIR / "utils" / "generatePdf.js"


class PdfGenerationError(RuntimeError):
    pass


def student_payload(student):
    return {
        "name": student.name,
        "studentId": student.student_id,
        "rollNumber": student.roll_number,
        "class": str(student.student_class),
        "category": student.category,
        "subjects": student.subjects,
        "venue": student.venue,
        "schoolName": student.coordinator.school_name,
        "coordinatorName": student.coordinator.coordinator_name,
        "coordinatorEmail": student.coordinator.user.email,
        "registrationId": getattr(getattr(student.coordinator, "payment", None), "registration_id", ""),
        "coordinator": {
            "schoolName": student.coordinator.school_name,
            "coordinatorName": student.coordinator.coordinator_name,
            "coordinatorEmail": student.coordinator.user.email,
            "coordinatorPhone": student.coordinator.coordinator_phone,
            "venue": student.venue,
        },
        "marks": {
            "english": student.english_marks,
            "math": student.math_marks,
            "science": student.science_marks,
            "cs": student.cs_marks,
        },
    }


def generate_student_pdf(student, kind, request=None):
    if kind not in {"report-card", "certificate", "admit-card"}:
        raise ValueError("Unsupported PDF type")
    if not PDF_BRIDGE.exists():
        raise PdfGenerationError(f"PDF bridge not found: {PDF_BRIDGE}")

    payload = student_payload(student)
    if request:
        payload["verifyBaseUrl"] = request.build_absolute_uri("/")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        input_path = tmpdir / "student.json"
        output_path = tmpdir / "output.pdf"
        input_path.write_text(json.dumps(payload), encoding="utf-8")

        result = subprocess.run(
            ["node", str(PDF_BRIDGE), kind, str(input_path), str(output_path)],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Unknown PDF generation error").strip()
            raise PdfGenerationError(message)
        return output_path.read_bytes()
