"""
APNs push notification service.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import push_device_token as crud_push_device_token
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

_APNS_AUTH_TOKEN: Optional[str] = None
_APNS_AUTH_TOKEN_ISSUED_AT: int = 0
_APNS_AUTH_TOKEN_TTL_SECONDS = 50 * 60  # APNs allows max 60 minutes

_INVALID_TOKEN_REASONS = {
    "BadDeviceToken",
    "DeviceTokenNotForTopic",
    "Unregistered",
}


def is_push_enabled() -> bool:
    if not settings.APNS_ENABLED:
        return False
    if not settings.APNS_KEY_ID or not settings.APNS_TEAM_ID or not settings.APNS_BUNDLE_ID:
        return False
    return _load_private_key() is not None


def _load_private_key() -> Optional[str]:
    if settings.APNS_PRIVATE_KEY and settings.APNS_PRIVATE_KEY.strip():
        return settings.APNS_PRIVATE_KEY.strip()
    if settings.APNS_PRIVATE_KEY_PATH and settings.APNS_PRIVATE_KEY_PATH.strip():
        path = settings.APNS_PRIVATE_KEY_PATH.strip()
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                return handle.read().strip()
    return None


def _build_apns_auth_token() -> Optional[str]:
    global _APNS_AUTH_TOKEN, _APNS_AUTH_TOKEN_ISSUED_AT

    now = int(time.time())
    if _APNS_AUTH_TOKEN and now - _APNS_AUTH_TOKEN_ISSUED_AT < _APNS_AUTH_TOKEN_TTL_SECONDS:
        return _APNS_AUTH_TOKEN

    private_key = _load_private_key()
    if not private_key:
        return None

    try:
        from jose import jwt
    except Exception as exc:  # pragma: no cover - optional runtime dependency check
        logger.warning("APNs disabled: python-jose import failed (%s)", exc)
        return None

    try:
        token = jwt.encode(
            {"iss": settings.APNS_TEAM_ID, "iat": now},
            private_key,
            algorithm="ES256",
            headers={"alg": "ES256", "kid": settings.APNS_KEY_ID},
        )
        _APNS_AUTH_TOKEN = token
        _APNS_AUTH_TOKEN_ISSUED_AT = now
        return token
    except Exception as exc:
        logger.error("APNs auth token build failed: %s", exc)
        return None


def _resolve_environment(token_environment: Optional[str]) -> str:
    normalized = (token_environment or "").strip().lower()
    if normalized in {"sandbox", "production"}:
        return normalized
    return "sandbox" if settings.APNS_USE_SANDBOX else "production"


def _resolve_apns_host(environment: str) -> str:
    if environment == "production":
        return "https://api.push.apple.com"
    return "https://api.sandbox.push.apple.com"


def send_push_to_user(
    db: Session,
    *,
    user_id: int,
    title: str,
    body: str,
    custom_data: Optional[Dict[str, str | int | float | bool]] = None,
) -> Dict[str, int]:
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not bool(getattr(user, "push_notifications_enabled", True)):
        return {"sent": 0, "failed": 0, "deactivated": 0}

    if not is_push_enabled():
        return {"sent": 0, "failed": 0, "deactivated": 0}

    auth_token = _build_apns_auth_token()
    if not auth_token:
        return {"sent": 0, "failed": 0, "deactivated": 0}

    tokens = crud_push_device_token.get_active_user_tokens(db, user_id=user_id, platform="ios")
    if not tokens:
        return {"sent": 0, "failed": 0, "deactivated": 0}

    try:
        import httpx
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning("APNs disabled: httpx import failed (%s)", exc)
        return {"sent": 0, "failed": len(tokens), "deactivated": 0}

    result = {"sent": 0, "failed": 0, "deactivated": 0}

    for token_row in tokens:
        environment = _resolve_environment(token_row.apns_environment)
        endpoint = f"{_resolve_apns_host(environment)}/3/device/{token_row.device_token}"
        payload = {
            "aps": {
                "alert": {"title": title, "body": body},
                "sound": "default",
            }
        }
        if custom_data:
            payload.update(custom_data)

        headers = {
            "authorization": f"bearer {auth_token}",
            "apns-topic": settings.APNS_BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
        }

        try:
            with httpx.Client(http2=True, timeout=settings.APNS_TIMEOUT_SECONDS) as client:
                response = client.post(endpoint, json=payload, headers=headers)
        except Exception as exc:
            logger.warning("APNs request failed (token_id=%s): %s", token_row.id, exc)
            result["failed"] += 1
            continue

        if response.status_code == 200:
            result["sent"] += 1
            continue

        result["failed"] += 1
        reason = None
        try:
            reason = response.json().get("reason")
        except Exception:
            reason = None

        logger.warning(
            "APNs non-200 response (token_id=%s status=%s reason=%s)",
            token_row.id,
            response.status_code,
            reason,
        )

        if reason in _INVALID_TOKEN_REASONS:
            deactivated = crud_push_device_token.deactivate_tokens_by_value(
                db, token_values=[token_row.device_token]
            )
            result["deactivated"] += deactivated

    return result


def send_push_for_notification(db: Session, notification: Notification) -> Dict[str, int]:
    custom_data: Dict[str, str | int | float | bool] = {
        "notification_id": int(notification.id),
        "notification_type": str(notification.type.value if hasattr(notification.type, "value") else notification.type),
    }
    if notification.appointment_id is not None:
        custom_data["appointment_id"] = int(notification.appointment_id)

    return send_push_to_user(
        db,
        user_id=int(notification.user_id),
        title=notification.title,
        body=notification.message,
        custom_data=custom_data,
    )
