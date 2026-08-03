from django.db import migrations


def update_roll_numbers(apps, schema_editor):
    Student = apps.get_model("Registartion", "Student")
    for student in Student.objects.all().only("id", "student_class", "roll_number"):
        student.roll_number = f"260{int(student.student_class):02d}26{int(student.id):03d}"
        student.save(update_fields=["roll_number"])


class Migration(migrations.Migration):
    dependencies = [("Registartion", "0010_normalize_admit_card_roll_numbers")]

    operations = [migrations.RunPython(update_roll_numbers, migrations.RunPython.noop)]
