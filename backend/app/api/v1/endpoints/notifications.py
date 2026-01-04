"""
Notifications API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.crud import notification as crud_notification
from app.schemas.notification import Notification, NotificationUpdate

router = APIRouter()


@router.get("/", response_model=List[Notification])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's notifications
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **unread_only**: Filter to only unread notifications
    """
    notifications = crud_notification.get_user_notifications(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only
    )
    return notifications


@router.get("/unread-count", response_model=dict)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get count of unread notifications
    """
    count = crud_notification.get_unread_count(db, user_id=current_user.id)
    return {"unread_count": count}


@router.get("/{notification_id}", response_model=Notification)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific notification
    """
    notification = crud_notification.get_notification(db, notification_id=notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this notification")
    
    return notification


@router.patch("/{notification_id}/read", response_model=Notification)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a notification as read
    """
    notification = crud_notification.get_notification(db, notification_id=notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this notification")
    
    notification = crud_notification.mark_as_read(db, notification_id=notification_id)
    return notification


@router.post("/mark-all-read", response_model=dict)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all user's notifications as read
    """
    count = crud_notification.mark_all_as_read(db, user_id=current_user.id)
    return {"marked_count": count}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a notification
    """
    notification = crud_notification.get_notification(db, notification_id=notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Verify ownership
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this notification")
    
    success = crud_notification.delete_notification(db, notification_id=notification_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete notification")
    
    return None
