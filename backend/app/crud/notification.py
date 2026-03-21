"""
Notification CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models.notification import Notification
from app.services import cache_service


UNREAD_COUNT_CACHE_TTL_SECONDS = 15


def _unread_count_cache_key(user_id: int) -> str:
    return f"notifications:unread-count:{int(user_id)}:v1"


def invalidate_unread_count_cache(user_id: int) -> None:
    cache_service.delete(_unread_count_cache_key(user_id))


def get_user_notifications(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False
) -> List[Notification]:
    """Get user's notifications"""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()


def get_notification(db: Session, notification_id: int) -> Optional[Notification]:
    """Get a specific notification"""
    return db.query(Notification).filter(Notification.id == notification_id).first()


def mark_as_read(db: Session, notification_id: int) -> Optional[Notification]:
    """Mark a notification as read"""
    notification = get_notification(db, notification_id)
    if notification and not notification.is_read:
        user_id = int(notification.user_id)
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
        invalidate_unread_count_cache(user_id)
    return notification


def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all user's notifications as read"""
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    db.commit()
    invalidate_unread_count_cache(int(user_id))
    return count


def delete_notification(db: Session, notification_id: int) -> bool:
    """Delete a notification"""
    notification = get_notification(db, notification_id)
    if notification:
        user_id = int(notification.user_id)
        db.delete(notification)
        db.commit()
        invalidate_unread_count_cache(user_id)
        return True
    return False


def get_unread_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications"""
    return int(
        cache_service.get_or_set_json(
            _unread_count_cache_key(user_id),
            ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
            loader=lambda: int(
                db.query(Notification).filter(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                ).count()
            ),
        )
    )


def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    related_id: Optional[int] = None
) -> Notification:
    """Create a new notification"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        appointment_id=related_id,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    invalidate_unread_count_cache(int(user_id))
    return notification
