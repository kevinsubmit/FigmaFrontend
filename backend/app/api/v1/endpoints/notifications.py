"""
Notifications API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.crud import notification as crud_notification
from app.crud import push_device_token as crud_push_device_token
from app.schemas.notification import (
    Notification,
    DeviceTokenRegisterRequest,
    DeviceTokenUnregisterRequest,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdateRequest,
    AdminTestPushRequest,
)
from app.core.config import settings
from app.services import push_service

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


@router.post("/devices/register", response_model=dict)
def register_push_device_token(
    payload: DeviceTokenRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Register (or refresh) current user's iOS device token for APNs.
    """
    default_env = "sandbox" if settings.APNS_USE_SANDBOX else "production"
    apns_environment = payload.apns_environment or default_env
    token_row = crud_push_device_token.upsert_device_token(
        db,
        user_id=current_user.id,
        device_token=payload.device_token,
        platform=payload.platform,
        apns_environment=apns_environment,
        app_version=payload.app_version,
        device_name=payload.device_name,
        locale=payload.locale,
        timezone=payload.timezone,
    )
    return {
        "detail": "Push device token registered",
        "device_id": token_row.id,
        "apns_environment": token_row.apns_environment,
    }


@router.post("/devices/unregister", response_model=dict)
def unregister_push_device_token(
    payload: DeviceTokenUnregisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate current user's iOS device token for APNs.
    """
    deactivated = crud_push_device_token.deactivate_device_token(
        db,
        user_id=current_user.id,
        device_token=payload.device_token,
    )
    return {
        "detail": "Push device token unregistered" if deactivated else "Push device token not found",
        "deactivated": bool(deactivated),
    }


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's notification preferences.
    """
    push_enabled = bool(getattr(current_user, "push_notifications_enabled", True))
    return NotificationPreferencesResponse(push_enabled=push_enabled)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    payload: NotificationPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update current user's notification preferences.
    """
    current_user.push_notifications_enabled = bool(payload.push_enabled)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    if not current_user.push_notifications_enabled:
        crud_push_device_token.deactivate_all_user_tokens(
            db,
            user_id=current_user.id,
            platform="ios",
        )

    return NotificationPreferencesResponse(
        push_enabled=bool(current_user.push_notifications_enabled)
    )


@router.post("/admin/test-push", response_model=dict)
def send_admin_test_push(
    payload: AdminTestPushRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a test push notification (super admin only).
    """
    if not current_user.is_admin or current_user.store_id is not None:
        raise HTTPException(status_code=403, detail="Only super admin can send test push")

    target_user_id = int(payload.user_id or current_user.id)
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    result = push_service.send_push_to_user(
        db,
        user_id=target_user_id,
        title=payload.title,
        body=payload.message,
        custom_data={"notification_type": "admin_test_push"},
    )
    return {
        "detail": "Test push sent",
        "target_user_id": target_user_id,
        **result,
    }


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
