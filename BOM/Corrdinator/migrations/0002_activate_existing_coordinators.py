from django.db import migrations


def activate_existing_coordinators(apps, schema_editor):
    User = apps.get_model("Account", "User")
    User.objects.filter(role="coordinator", is_active=False).update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [
        ("Corrdinator", "0001_initial"),
        ("Account", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(activate_existing_coordinators, migrations.RunPython.noop),
    ]
