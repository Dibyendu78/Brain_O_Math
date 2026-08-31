from functools import wraps

from django.http import JsonResponse
from django.shortcuts import redirect

from Account.authentication import decode_access_token
from Account.models import User


def get_token_from_request(request):
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1].strip()
    if request.GET.get("token"):
        return request.GET.get("token").strip()
    return request.COOKIES.get("access_token")


def _redirect_for_html(request):
    if request.method != "GET" or request.path.startswith("/api/"):
        return None
    if request.path.startswith("/admin-control") or request.path.startswith("/admin-"):
        return redirect("/coordinator-login.html")
    if request.path.startswith("/coordinator/"):
        return redirect("/coordinator-login.html")
    return None


def jwt_required(view_func=None, *, roles=None):
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            token = get_token_from_request(request)
            if not token:
                redirect_response = _redirect_for_html(request)
                if redirect_response:
                    return redirect_response
                return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)

            try:
                payload = decode_access_token(token)
                user = User.objects.get(id=payload["user_id"], is_active=True)
            except Exception as exc:
                redirect_response = _redirect_for_html(request)
                if redirect_response:
                    return redirect_response
                return JsonResponse({"success": False, "message": str(exc)}, status=401)

            if roles and user.role not in roles and not (User.ADMIN in roles and user.is_superuser):
                redirect_response = _redirect_for_html(request)
                if redirect_response:
                    return redirect_response
                return JsonResponse({"success": False, "message": "Forbidden"}, status=403)

            request.user = user
            return func(request, *args, **kwargs)

        return wrapper

    if view_func is None:
        return decorator
    return decorator(view_func)
