"""
Push device token CRUD operations.
"""
from datetime import datetime
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session

from app.models.push_device_token import PushDeviceToken


def normalize_device_token(device_token: str) -> str:
    token = (device_token or "").strip().replace(" ", "")
    if token.startswith("<") and token.endswith(">"):
        token = token[1:-1]
    return token.lower()


def upsert_device_token(
    db: Session,
    *,
    user_id: int,
    device_token: str,
    platform: str = "ios",
    apns_environment: str = "sandbox",
    app_version: Optional[str] = None,
    device_name: Optional[str] = None,
    locale: Optional[str] = None,
    timezone: Optional[str] = None,
) -> PushDeviceToken:
    normalized_token = normalize_device_token(device_token)
    now = datetime.utcnow()

    token_row = (
        db.query(PushDeviceToken)
        .filter(PushDeviceToken.device_token == normalized_token)
        .first()
    )

    if token_row:
        token_row.user_id = int(user_id)
        token_row.platform = platform
        token_row.apns_environment = apns_environment
        token_row.app_version = app_version
        token_row.device_name = device_name
        token_row.locale = locale
        token_row.timezone = timezone
        token_row.is_active = True
        token_row.last_seen_at = now
    else:
        token_row = PushDeviceToken(
            user_id=int(user_id),
            platform=platform,
            device_token=normalized_token,
            apns_environment=apns_environment,
            app_version=app_version,
            device_name=device_name,
            locale=locale,
            timezone=timezone,
            is_active=True,
            last_seen_at=now,
        )
        db.add(token_row)

    db.commit()
    db.refresh(token_row)
    return token_row


def deactivate_device_token(db: Session, *, user_id: int, device_token: str) -> bool:
    normalized_token = normalize_device_token(device_token)
    token_row = (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.user_id == int(user_id),
            PushDeviceToken.device_token == normalized_token,
            PushDeviceToken.is_active == True,
        )
        .first()
    )
    if not token_row:
        return False
    token_row.is_active = False
    token_row.last_seen_at = datetime.utcnow()
    db.commit()
    return True


def get_active_user_tokens(
    db: Session,
    *,
    user_id: int,
    platform: str = "ios",
) -> List[PushDeviceToken]:
    return (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.user_id == int(user_id),
            PushDeviceToken.platform == platform,
            PushDeviceToken.is_active == True,
        )
        .all()
    )


def deactivate_tokens_by_value(
    db: Session,
    *,
    token_values: Iterable[str],
) -> int:
    normalized_values = [normalize_device_token(value) for value in token_values if value]
    if not normalized_values:
        return 0
    rows = (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.device_token.in_(normalized_values),
            PushDeviceToken.is_active == True,
        )
        .all()
    )
    if not rows:
        return 0
    now = datetime.utcnow()
    for row in rows:
        row.is_active = False
        row.last_seen_at = now
    db.commit()
    return len(rows)


def deactivate_all_user_tokens(
    db: Session,
    *,
    user_id: int,
    platform: Optional[str] = None,
) -> int:
    query = db.query(PushDeviceToken).filter(
        PushDeviceToken.user_id == int(user_id),
        PushDeviceToken.is_active == True,
    )
    if platform:
        query = query.filter(PushDeviceToken.platform == platform)
    rows = query.all()
    if not rows:
        return 0
    now = datetime.utcnow()
    for row in rows:
        row.is_active = False
        row.last_seen_at = now
    db.commit()
    return len(rows)
