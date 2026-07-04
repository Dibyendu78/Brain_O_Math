from django.http import JsonResponse

from Registartion.models import RegistrationSettings


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
            },
        }
    )
