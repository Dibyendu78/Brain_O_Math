import os
from datetime import datetime, timedelta, timezone

import jwt


def _secret(name, fallback):
    return os.getenv(name) or os.getenv("SECRET_KEY") or fallback


def create_access_token(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=40),
    }
    return jwt.encode(payload, _secret("JWT_SECRET_KEY", "bom_access_secret_for_development_32bytes"), algorithm="HS256")


def decode_access_token(token):
    try:
        return jwt.decode(token, _secret("JWT_SECRET_KEY", "bom_access_secret_for_development_32bytes"), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid token") from exc


def create_refresh_token(user):
    payload = {
        "user_id": user.id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, _secret("JWT_REFRESH_SECRET_KEY", "bom_refresh_secret_for_development_32bytes"), algorithm="HS256")


def decode_refresh_token(token):
    try:
        return jwt.decode(token, _secret("JWT_REFRESH_SECRET_KEY", "bom_refresh_secret_for_development_32bytes"), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Refresh token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid refresh token") from exc
