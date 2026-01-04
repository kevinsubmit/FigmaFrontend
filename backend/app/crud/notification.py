"""
Notification CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models.notification import Notification


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
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
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
    return count


def delete_notification(db: Session, notification_id: int) -> bool:
    """Delete a notification"""
    notification = get_notification(db, notification_id)
    if notification:
        db.delete(notification)
        db.commit()
        return True
    return False


def get_unread_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications"""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
