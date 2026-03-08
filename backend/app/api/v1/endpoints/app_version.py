"""
App version policy/check endpoints.
"""
from datetime import datetime, timezone
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.app_version_policy import AppVersionPolicy
from app.models.user import User
from app.schemas.app_version import (
    AppPlatform,
    AppVersionCheckResponse,
    AppVersionPolicyResponse,
    AppVersionPolicyUpdateRequest,
)
from app.services import log_service

router = APIRouter()

_SUPPORTED_PLATFORMS: tuple[AppPlatform, ...] = ("ios", "android", "h5")


def _normalize_platform(value: str) -> AppPlatform:
    platform = (value or "").strip().lower()
    if platform not in _SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported platform '{value}'. Allowed: ios/android/h5",
        )
    return platform  # type: ignore[return-value]


def _ensure_super_admin(current_user: User) -> None:
    if not current_user.is_admin or current_user.store_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can manage app version policy",
        )


def _extract_numeric_version_parts(raw_value: Optional[str]) -> list[int]:
    if raw_value is None:
        return []
    text = str(raw_value).strip()
    if not text:
        return []
    match = re.search(r"\d+(?:\.\d+){0,6}", text)
    if not match:
        return []
    parts = [int(part) for part in match.group(0).split(".")]
    while parts and parts[-1] == 0:
        parts.pop()
    return parts


def _compare_versions(current_version: Optional[str], target_version: Optional[str]) -> int:
    current = _extract_numeric_version_parts(current_version)
    target = _extract_numeric_version_parts(target_version)
    if not current and not target:
        return 0
    max_len = max(len(current), len(target))
    current_extended = current + [0] * (max_len - len(current))
    target_extended = target + [0] * (max_len - len(target))
    if current_extended < target_extended:
        return -1
    if current_extended > target_extended:
        return 1
    return 0


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized if normalized else None


def _safe_table_query(db: Session, platform: AppPlatform) -> Optional[AppVersionPolicy]:
    try:
        return (
            db.query(AppVersionPolicy)
            .filter(AppVersionPolicy.platform == platform)
            .first()
        )
    except SQLAlchemyError:
        return None


def _safe_check_logic(
    policy: Optional[AppVersionPolicy],
    current_version: Optional[str],
    current_build: Optional[int],
) -> tuple[bool, bool]:
    if not policy or not policy.is_enabled:
        return False, False

    force_update = False
    should_update = False

    if current_version and policy.min_supported_version:
        if _compare_versions(current_version, policy.min_supported_version) < 0:
            force_update = True

    if policy.min_supported_build is not None and current_build is not None:
        if int(current_build) < int(policy.min_supported_build):
            force_update = True

    if current_version and policy.latest_version:
        if _compare_versions(current_version, policy.latest_version) < 0:
            should_update = True

    if policy.latest_build is not None and current_build is not None:
        if int(current_build) < int(policy.latest_build):
            should_update = True

    if force_update:
        should_update = True

    return should_update, force_update


def _default_title(force_update: bool) -> str:
    return "Update Required" if force_update else "Update Available"


def _default_message(force_update: bool) -> str:
    if force_update:
        return "A newer version is required to continue. Please update your app."
    return "A newer version is available. Update now for the best experience."


@router.get("/check", response_model=AppVersionCheckResponse)
def check_app_version(
    platform: str = Query("ios"),
    current_version: Optional[str] = Query(None),
    current_build: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    """
    Public version-check endpoint for mobile/web clients.
    """
    normalized_platform = _normalize_platform(platform)
    policy = _safe_table_query(db, normalized_platform)
    should_update, force_update = _safe_check_logic(policy, current_version, current_build)

    return AppVersionCheckResponse(
        platform=normalized_platform,
        current_version=current_version.strip() if isinstance(current_version, str) and current_version.strip() else None,
        current_build=current_build,
        latest_version=policy.latest_version if policy else "",
        latest_build=policy.latest_build if policy else None,
        min_supported_version=policy.min_supported_version if policy else "",
        min_supported_build=policy.min_supported_build if policy else None,
        should_update=should_update,
        force_update=force_update,
        update_title=(policy.update_title if policy and policy.update_title else _default_title(force_update))
        if should_update
        else None,
        update_message=(policy.update_message if policy and policy.update_message else _default_message(force_update))
        if should_update
        else None,
        release_notes=policy.release_notes if policy else None,
        app_store_url=policy.app_store_url if policy else None,
        checked_at=datetime.now(timezone.utc),
    )


@router.get("/admin/policies", response_model=list[AppVersionPolicyResponse])
def get_version_policies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_super_admin(current_user)
    try:
        return (
            db.query(AppVersionPolicy)
            .order_by(AppVersionPolicy.platform.asc())
            .all()
        )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="App version policy table is not ready. Please run migrate_app_version_policy.py first.",
        )


@router.get("/admin/policy", response_model=AppVersionPolicyResponse)
def get_version_policy(
    platform: str = Query("ios"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_super_admin(current_user)
    normalized_platform = _normalize_platform(platform)
    try:
        policy = (
            db.query(AppVersionPolicy)
            .filter(AppVersionPolicy.platform == normalized_platform)
            .first()
        )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="App version policy table is not ready. Please run migrate_app_version_policy.py first.",
        )
    if not policy:
        policy = AppVersionPolicy(platform=normalized_platform, is_enabled=True)
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


@router.put("/admin/policy", response_model=AppVersionPolicyResponse)
def upsert_version_policy(
    payload: AppVersionPolicyUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_super_admin(current_user)
    platform = _normalize_platform(payload.platform)
    if payload.app_store_url and not payload.app_store_url.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="app_store_url must start with http:// or https://")

    if payload.min_supported_version and payload.latest_version:
        if _compare_versions(payload.min_supported_version, payload.latest_version) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_supported_version cannot be greater than latest_version",
            )

    if payload.min_supported_build is not None and payload.latest_build is not None:
        if int(payload.min_supported_build) > int(payload.latest_build):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_supported_build cannot be greater than latest_build",
            )

    try:
        policy = (
            db.query(AppVersionPolicy)
            .filter(AppVersionPolicy.platform == platform)
            .first()
        )
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="App version policy table is not ready. Please run migrate_app_version_policy.py first.",
        )

    before = None
    if policy:
        before = {
            "latest_version": policy.latest_version,
            "latest_build": policy.latest_build,
            "min_supported_version": policy.min_supported_version,
            "min_supported_build": policy.min_supported_build,
            "app_store_url": policy.app_store_url,
            "update_title": policy.update_title,
            "update_message": policy.update_message,
            "release_notes": policy.release_notes,
            "is_enabled": policy.is_enabled,
        }
    else:
        policy = AppVersionPolicy(platform=platform)
        db.add(policy)

    policy.latest_version = (payload.latest_version or "").strip()
    policy.latest_build = payload.latest_build
    policy.min_supported_version = (payload.min_supported_version or "").strip()
    policy.min_supported_build = payload.min_supported_build
    policy.app_store_url = _normalize_optional_text(payload.app_store_url)
    policy.update_title = _normalize_optional_text(payload.update_title)
    policy.update_message = _normalize_optional_text(payload.update_message)
    policy.release_notes = _normalize_optional_text(payload.release_notes)
    policy.is_enabled = bool(payload.is_enabled)
    db.commit()
    db.refresh(policy)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="app_version",
        action="update_policy",
        message=f"Updated app version policy for {platform}",
        target_type="app_version_policy",
        target_id=str(policy.id),
        before=before,
        after={
            "latest_version": policy.latest_version,
            "latest_build": policy.latest_build,
            "min_supported_version": policy.min_supported_version,
            "min_supported_build": policy.min_supported_build,
            "app_store_url": policy.app_store_url,
            "update_title": policy.update_title,
            "update_message": policy.update_message,
            "release_notes": policy.release_notes,
            "is_enabled": policy.is_enabled,
        },
    )

    return policy
