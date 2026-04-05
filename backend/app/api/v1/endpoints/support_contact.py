"""Support and partnership contact settings endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.support_contact_settings import SupportContactSettings
from app.models.user import User
from app.schemas.support_contact import (
    SupportContactSettingsResponse,
    SupportContactSettingsUpdateRequest,
)
from app.services import log_service

router = APIRouter()

_DEFAULT_CONTACT_SETTINGS = {
    "feedback_whatsapp_url": "https://wa.me/14151234567",
    "feedback_imessage_url": "sms:+14151234567",
    "feedback_instagram_url": "https://instagram.com",
    "partnership_whatsapp_url": "https://wa.me/14151234567",
    "partnership_imessage_url": "sms:+14151234567",
}
_ALLOWED_URL_PREFIXES = ("http://", "https://", "sms:")


def _ensure_super_admin(current_user: User) -> None:
    if not current_user.is_admin or current_user.store_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can manage support contact settings",
        )


def _normalize_contact_url(value: str, field_name: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} is required",
        )
    if not normalized.lower().startswith(_ALLOWED_URL_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must start with http://, https://, or sms:",
        )
    return normalized


def _get_settings_row(db: Session) -> SupportContactSettings | None:
    try:
        return (
            db.query(SupportContactSettings)
            .filter(SupportContactSettings.singleton_key == "default")
            .first()
        )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Support contact settings table is not ready. Please run database migrations.",
        ) from exc


def _to_response(settings: SupportContactSettings | None) -> SupportContactSettingsResponse:
    if settings is not None:
        return SupportContactSettingsResponse(
            feedback_whatsapp_url=settings.feedback_whatsapp_url,
            feedback_imessage_url=settings.feedback_imessage_url,
            feedback_instagram_url=settings.feedback_instagram_url,
            partnership_whatsapp_url=settings.partnership_whatsapp_url,
            partnership_imessage_url=settings.partnership_imessage_url,
            created_at=settings.created_at,
            updated_at=settings.updated_at,
        )
    fallback_timestamp = datetime.now(timezone.utc)
    return SupportContactSettingsResponse(
        created_at=fallback_timestamp,
        updated_at=fallback_timestamp,
        **_DEFAULT_CONTACT_SETTINGS,
    )


def _settings_snapshot(settings: SupportContactSettings | None) -> dict[str, str]:
    if settings is None:
        return dict(_DEFAULT_CONTACT_SETTINGS)
    return {
        "feedback_whatsapp_url": settings.feedback_whatsapp_url,
        "feedback_imessage_url": settings.feedback_imessage_url,
        "feedback_instagram_url": settings.feedback_instagram_url,
        "partnership_whatsapp_url": settings.partnership_whatsapp_url,
        "partnership_imessage_url": settings.partnership_imessage_url,
    }


@router.get("", response_model=SupportContactSettingsResponse)
def get_support_contact_settings(db: Session = Depends(get_db)):
    return _to_response(_get_settings_row(db))


@router.get("/admin", response_model=SupportContactSettingsResponse)
def get_support_contact_settings_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_super_admin(current_user)
    return _to_response(_get_settings_row(db))


@router.put("/admin", response_model=SupportContactSettingsResponse)
def update_support_contact_settings_admin(
    payload: SupportContactSettingsUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_super_admin(current_user)

    settings = _get_settings_row(db)
    before = _settings_snapshot(settings)

    if settings is None:
        settings = SupportContactSettings(singleton_key="default")
        db.add(settings)

    settings.feedback_whatsapp_url = _normalize_contact_url(payload.feedback_whatsapp_url, "feedback_whatsapp_url")
    settings.feedback_imessage_url = _normalize_contact_url(payload.feedback_imessage_url, "feedback_imessage_url")
    settings.feedback_instagram_url = _normalize_contact_url(payload.feedback_instagram_url, "feedback_instagram_url")
    settings.partnership_whatsapp_url = _normalize_contact_url(payload.partnership_whatsapp_url, "partnership_whatsapp_url")
    settings.partnership_imessage_url = _normalize_contact_url(payload.partnership_imessage_url, "partnership_imessage_url")
    settings.updated_by = current_user.id

    db.commit()
    db.refresh(settings)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="support_contact",
        action="update_settings",
        message="Updated support and partnership contact settings",
        target_type="support_contact_settings",
        target_id=str(settings.id),
        before=before,
        after=_settings_snapshot(settings),
    )

    return settings
