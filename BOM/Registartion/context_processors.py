from Registartion.models import RegistrationSettings


def event_config(request):
    return {"event_config": RegistrationSettings.current()}
