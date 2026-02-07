"""
Store admin applications API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.crud import store_admin_application as crud_applications
from app.models.user import User
from app.models.store_admin_application import StoreAdminApplication
from app.models.store import Store
from app.schemas.store import StoreCreate
from app.crud import store as crud_store
from app.schemas.store_admin_application import (
    StoreAdminApplicationCreate,
    StoreAdminApplicationResponse,
    StoreAdminApplicationUpdate,
    StoreAdminApplicationDecision
)

router = APIRouter()


@router.post("/", response_model=StoreAdminApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_store_admin_application(
    payload: StoreAdminApplicationCreate,
    db: Session = Depends(get_db)
):
    """Submit store admin application (public)."""
    try:
        application = crud_applications.create_application(db, payload)
        return application
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/me", response_model=StoreAdminApplicationResponse)
def get_my_application(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = crud_applications.get_by_user_id(db, current_user.id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch("/me", response_model=StoreAdminApplicationResponse)
def update_my_application(
    payload: StoreAdminApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = crud_applications.get_by_user_id(db, current_user.id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return crud_applications.update_application(db, application, payload)


@router.post("/submit-review", response_model=StoreAdminApplicationResponse)
def submit_for_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = crud_applications.get_by_user_id(db, current_user.id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if not application.store_address or not application.store_phone:
        raise HTTPException(
            status_code=400,
            detail="Please complete store address and phone before submitting"
        )

    if application.status == "pending_review":
        return application

    if application.status not in {"pending_profile", "pending"}:
        raise HTTPException(
            status_code=400,
            detail="Application is not in a submittable state"
        )

    application.status = "pending_review"
    current_user.store_admin_status = "pending_review"
    db.add(application)
    db.add(current_user)
    db.commit()
    db.refresh(application)
    return application


@router.get("/admin", response_model=list[StoreAdminApplicationResponse])
def list_applications(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(StoreAdminApplication)
    if status_filter:
        query = query.filter(StoreAdminApplication.status == status_filter)
    return query.order_by(StoreAdminApplication.created_at.desc()).all()


def _parse_address(address: str) -> tuple[str, str, str, str]:
    parts = [part.strip() for part in address.split(',')]
    if len(parts) < 3:
        raise ValueError("Address must include street, city, state, and ZIP")
    street = parts[0]
    city = parts[1]
    state_zip = parts[2].split()
    if len(state_zip) < 2:
        raise ValueError("Address must include state and ZIP")
    state = state_zip[0]
    zip_code = state_zip[1]
    return street, city, state, zip_code


@router.post("/admin/{application_id}/approve", response_model=StoreAdminApplicationResponse)
def approve_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    application = db.query(crud_applications.StoreAdminApplication).filter(
        StoreAdminApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status == "approved":
        return application

    if application.status != "pending_review":
        raise HTTPException(status_code=400, detail="Application is not ready for approval")

    if not application.store_address or not application.store_phone:
        raise HTTPException(status_code=400, detail="Store info incomplete")

    try:
        street, city, state, zip_code = _parse_address(application.store_address)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    store = crud_store.create_store(
        db,
        StoreCreate(
            name=application.store_name,
            address=street,
            city=city,
            state=state,
            zip_code=zip_code,
            phone=application.store_phone,
            opening_hours=application.opening_hours
        )
    )

    user = db.query(User).filter(User.id == application.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.store_id = store.id
    user.store_admin_status = "approved"

    application.status = "approved"
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()
    application.store_id = store.id

    db.add(user)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.post("/admin/{application_id}/reject", response_model=StoreAdminApplicationResponse)
def reject_application(
    application_id: int,
    payload: StoreAdminApplicationDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    application = db.query(crud_applications.StoreAdminApplication).filter(
        StoreAdminApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status == "rejected":
        return application

    application.status = "rejected"
    application.review_reason = payload.review_reason
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()

    user = db.query(User).filter(User.id == application.user_id).first()
    if user:
        user.store_admin_status = "rejected"
        db.add(user)

    db.add(application)
    db.commit()
    db.refresh(application)
    return application
