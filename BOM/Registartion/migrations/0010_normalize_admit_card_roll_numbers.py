from django.db import migrations


def normalize_roll_numbers(apps, schema_editor):
    Student = apps.get_model("Registartion", "Student")
    for student in Student.objects.all().only("id", "student_class", "roll_number"):
        student.roll_number = f"BOM{int(student.student_class):02d}26{int(student.id):03d}"
        student.save(update_fields=["roll_number"])


class Migration(migrations.Migration):
    dependencies = [("Registartion", "0009_alter_registrationsettings_admit_card_release_date_and_more")]

    operations = [migrations.RunPython(normalize_roll_numbers, migrations.RunPython.noop)]
