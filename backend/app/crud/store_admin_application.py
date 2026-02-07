"""
Store admin application CRUD
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.store_admin_application import StoreAdminApplication
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.store_admin_application import StoreAdminApplicationCreate, StoreAdminApplicationUpdate


def get_pending_by_phone(db: Session, phone: str) -> Optional[StoreAdminApplication]:
    return (
        db.query(StoreAdminApplication)
        .filter(
            StoreAdminApplication.phone == phone,
            StoreAdminApplication.status == "pending"
        )
        .first()
    )


def get_by_user_id(db: Session, user_id: int) -> Optional[StoreAdminApplication]:
    return db.query(StoreAdminApplication).filter(StoreAdminApplication.user_id == user_id).first()


def update_application(
    db: Session,
    application: StoreAdminApplication,
    payload: StoreAdminApplicationUpdate
) -> StoreAdminApplication:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def create_application(
    db: Session,
    payload: StoreAdminApplicationCreate
) -> StoreAdminApplication:
    existing_pending = get_pending_by_phone(db, payload.phone)
    if existing_pending:
        raise ValueError("Application already pending for this phone")

    existing_user = db.query(User).filter(User.phone == payload.phone).first()
    if existing_user:
        raise ValueError("Phone already registered")

    user = User(
        phone=payload.phone,
        username=payload.phone,
        password_hash=get_password_hash(payload.password),
        full_name=None,
        email=None,
        phone_verified=True,
        is_active=True,
        is_admin=False,
        store_id=None,
        store_admin_status="pending_profile"
    )
    db.add(user)
    db.flush()

    application = StoreAdminApplication(
        phone=payload.phone,
        password_hash=get_password_hash(payload.password),
        store_name=payload.store_name,
        status="pending_profile",
        user_id=user.id
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application
