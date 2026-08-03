from django.db import migrations


def remove_legacy_bom_prefix(apps, schema_editor):
    Student = apps.get_model("Registartion", "Student")

    for student in Student.objects.filter(roll_number__startswith="BOM").only("id", "roll_number"):
        student.roll_number = student.roll_number[3:]
        student.save(update_fields=["roll_number"])


class Migration(migrations.Migration):
    dependencies = [("Registartion", "0011_update_roll_number_format")]

    operations = [
        migrations.RunPython(remove_legacy_bom_prefix, migrations.RunPython.noop),
    ]
