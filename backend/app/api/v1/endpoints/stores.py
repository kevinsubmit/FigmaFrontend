"""
Stores API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.api.deps import get_db, get_current_admin_user, get_current_store_admin, get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.crud import store as crud_store, service as crud_service, store_favorite as crud_favorite
from app.schemas.store import (
    Store,
    StoreWithImages,
    StoreImage,
    StoreCreate,
    StoreUpdate,
    StoreImageCreate,
    StoreVisibilityUpdate,
    StoreRankingUpdate,
)
from app.schemas.service import Service
from app.schemas.user import UserResponse
from app.services import log_service

router = APIRouter()


def _resolve_optional_user(db: Session, request: Request) -> Optional[User]:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def _can_access_hidden_store(user: Optional[User], store_id: Optional[int] = None) -> bool:
    if not user:
        return False
    if user.is_admin:
        return True
    if store_id is not None and user.store_id == store_id:
        return True
    return False


@router.get("/", response_model=List[Store])
def get_stores(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    city: Optional[str] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: Optional[str] = Query("recommended", regex="^(recommended|distance|top_rated)$"),
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of stores with optional filters and sorting
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **city**: Filter by city name
    - **search**: Search in store name and address
    - **min_rating**: Filter by minimum rating (0-5)
    - **sort_by**: Sort results (recommended, distance, top_rated)
    - **user_lat**: User latitude (required for distance sorting)
    - **user_lng**: User longitude (required for distance sorting)
    """
    current_user = _resolve_optional_user(db, request)
    include_hidden = _can_access_hidden_store(current_user)

    stores = crud_store.get_stores(
        db,
        skip=skip,
        limit=limit,
        city=city,
        search=search,
        min_rating=min_rating,
        sort_by=sort_by,
        user_lat=user_lat,
        user_lng=user_lng,
        include_hidden=include_hidden,
    )
    return stores


@router.get("/{store_id}", response_model=StoreWithImages)
def get_store(
    request: Request,
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get store details by ID including images
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    current_user = _resolve_optional_user(db, request)
    if store.is_visible is False and not _can_access_hidden_store(current_user, store_id=store.id):
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get store images
    images = crud_store.get_store_images(db, store_id=store_id)
    
    # Convert to response model
    store_dict = {
        **store.__dict__,
        "images": images
    }
    
    return store_dict


@router.get("/{store_id}/images", response_model=List[StoreImage])
def get_store_images(
    request: Request,
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get store images
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    current_user = _resolve_optional_user(db, request)
    if store.is_visible is False and not _can_access_hidden_store(current_user, store_id=store.id):
        raise HTTPException(status_code=404, detail="Store not found")
    
    images = crud_store.get_store_images(db, store_id=store_id)
    return images


@router.get("/{store_id}/services", response_model=List[Service])
def get_store_services(
    request: Request,
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all services offered by a store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    current_user = _resolve_optional_user(db, request)
    if store.is_visible is False and not _can_access_hidden_store(current_user, store_id=store.id):
        raise HTTPException(status_code=404, detail="Store not found")
    
    services = crud_service.get_store_services(db, store_id=store_id)
    return services


@router.patch("/{store_id}/visibility", response_model=Store)
def update_store_visibility(
    request: Request,
    store_id: int,
    payload: StoreVisibilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update store visibility (super admin only)."""
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    before_value = bool(store.is_visible)
    store.is_visible = bool(payload.is_visible)
    db.commit()
    db.refresh(store)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="stores",
        action="store.visibility.update",
        message="更新店铺展示状态",
        target_type="store",
        target_id=str(store.id),
        store_id=store.id,
        before={"is_visible": before_value},
        after={"is_visible": bool(store.is_visible)},
    )
    return store


@router.patch("/{store_id}/ranking", response_model=Store)
def update_store_ranking(
    request: Request,
    store_id: int,
    payload: StoreRankingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update store ranking params (super admin only)."""
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    before = {
        "manual_rank": store.manual_rank,
        "boost_score": store.boost_score,
        "featured_until": str(store.featured_until) if store.featured_until else None,
    }

    if payload.manual_rank is not None and payload.manual_rank < 0:
        raise HTTPException(status_code=400, detail="manual_rank must be >= 0")

    if payload.manual_rank is not None:
        store.manual_rank = payload.manual_rank
    if payload.boost_score is not None:
        store.boost_score = float(payload.boost_score)
    if "featured_until" in payload.model_fields_set:
        store.featured_until = payload.featured_until

    db.commit()
    db.refresh(store)

    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="stores",
        action="store.ranking.update",
        message="更新店铺排序参数",
        target_type="store",
        target_id=str(store.id),
        store_id=store.id,
        before=before,
        after={
            "manual_rank": store.manual_rank,
            "boost_score": store.boost_score,
            "featured_until": str(store.featured_until) if store.featured_until else None,
        },
    )
    return store


@router.post("/", response_model=Store, status_code=201)
def create_store(
    store: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create a new store (Admin only)
    
    Requires admin permissions
    """
    new_store = crud_store.create_store(db, store=store)
    return new_store


@router.patch("/{store_id}", response_model=Store)
def update_store(
    store_id: int,
    store: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update store information (Store admin only)
    
    - Super admin can update any store
    - Store manager can only update their own store
    """
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own store"
            )
    
    updated_store = crud_store.update_store(db, store_id=store_id, store=store)
    if not updated_store:
        raise HTTPException(status_code=404, detail="Store not found")
    return updated_store


@router.delete("/{store_id}", status_code=204)
def delete_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a store (Admin only)
    
    Requires admin permissions
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    crud_store.delete_store(db, store_id=store_id)
    return None


@router.post("/{store_id}/images", response_model=StoreImage, status_code=201)
def create_store_image(
    store_id: int,
    image_url: str,
    is_primary: int = 0,
    display_order: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Add an image to a store (Store admin only)
    
    - Super admin can add images to any store
    - Store manager can only add images to their own store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only add images to your own store"
            )
    
    new_image = crud_store.create_store_image(
        db,
        store_id=store_id,
        image_url=image_url,
        is_primary=is_primary,
        display_order=display_order
    )
    return new_image


@router.delete("/{store_id}/images/{image_id}", status_code=204)
def delete_store_image(
    store_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete a store image (Store admin only)
    
    - Super admin can delete images from any store
    - Store manager can only delete images from their own store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete images from your own store"
            )
    
    deleted = crud_store.delete_store_image(db, image_id=image_id, store_id=store_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return None


@router.get("/{store_id}/appointments", response_model=List[dict])
def get_store_appointments(
    store_id: int,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Get store's appointments (Store admin only)
    
    - Super admin can view appointments from any store
    - Store manager can only view appointments from their own store
    """
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.service import Service
    from app.models.technician import Technician
    from app.models.user import User as UserModel
    from datetime import datetime
    
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view appointments from your own store"
            )
    
    # Build query
    query = db.query(
        Appointment,
        Service.name.label('service_name'),
        Service.duration_minutes.label('duration'),
        Technician.name.label('technician_name'),
        func.coalesce(UserModel.full_name, UserModel.username).label('customer_name'),
        UserModel.phone.label('customer_phone')
    ).join(
        Service, Appointment.service_id == Service.id
    ).join(
        Technician, Appointment.technician_id == Technician.id
    ).join(
        UserModel, Appointment.user_id == UserModel.id
    ).filter(
        Service.store_id == store_id
    )
    
    # Apply filters
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status. Use: {', '.join([s.value for s in AppointmentStatus])}")
    
    # Execute query with pagination
    appointments = query.order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc()
    ).offset(skip).limit(limit).all()
    
    # Format response
    result = []
    for appt, service_name, duration, tech_name, cust_name, cust_phone in appointments:
        result.append({
            "id": appt.id,
            "appointment_date": str(appt.appointment_date),
            "appointment_time": str(appt.appointment_time),
            "service_name": service_name,
            "duration_minutes": duration,
            "technician_name": tech_name,
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "status": appt.status,
            "notes": appt.notes,
            "created_at": str(appt.created_at)
        })
    
    return result


@router.get("/{store_id}/appointments/stats", response_model=dict)
def get_store_appointment_stats(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Get store's appointment statistics (Store admin only)
    
    Returns statistics for today, this week, and this month
    """
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.service import Service
    from datetime import datetime, date, timedelta
    from sqlalchemy import func
    
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view statistics from your own store"
            )
    
    # Calculate date ranges
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday of current week
    month_start = today.replace(day=1)
    
    # Base query
    base_query = db.query(Appointment).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Service.store_id == store_id
    )
    
    # Today's stats
    today_total = base_query.filter(Appointment.appointment_date == today).count()
    today_pending = base_query.filter(
        Appointment.appointment_date == today,
        Appointment.status == AppointmentStatus.PENDING
    ).count()
    today_confirmed = base_query.filter(
        Appointment.appointment_date == today,
        Appointment.status == AppointmentStatus.CONFIRMED
    ).count()
    today_completed = base_query.filter(
        Appointment.appointment_date == today,
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    # This week's stats
    week_total = base_query.filter(Appointment.appointment_date >= week_start).count()
    week_pending = base_query.filter(
        Appointment.appointment_date >= week_start,
        Appointment.status == AppointmentStatus.PENDING
    ).count()
    week_confirmed = base_query.filter(
        Appointment.appointment_date >= week_start,
        Appointment.status == AppointmentStatus.CONFIRMED
    ).count()
    week_completed = base_query.filter(
        Appointment.appointment_date >= week_start,
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    # This month's stats
    month_total = base_query.filter(Appointment.appointment_date >= month_start).count()
    month_pending = base_query.filter(
        Appointment.appointment_date >= month_start,
        Appointment.status == AppointmentStatus.PENDING
    ).count()
    month_confirmed = base_query.filter(
        Appointment.appointment_date >= month_start,
        Appointment.status == AppointmentStatus.CONFIRMED
    ).count()
    month_completed = base_query.filter(
        Appointment.appointment_date >= month_start,
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    return {
        "today": {
            "total": today_total,
            "pending": today_pending,
            "confirmed": today_confirmed,
            "completed": today_completed
        },
        "this_week": {
            "total": week_total,
            "pending": week_pending,
            "confirmed": week_confirmed,
            "completed": week_completed
        },
        "this_month": {
            "total": month_total,
            "pending": month_pending,
            "confirmed": month_confirmed,
            "completed": month_completed
        }
    }



# ==================== Store Favorites ====================

@router.post("/{store_id}/favorite", status_code=201)
def add_store_to_favorites(
    store_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a store to user's favorites (requires authentication)
    """
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Add to favorites
    favorite = crud_favorite.add_favorite(db, user_id=current_user.id, store_id=store_id)
    
    if not favorite:
        raise HTTPException(status_code=400, detail="Store already in favorites")
    
    return {"message": "Store added to favorites", "store_id": store_id}


@router.delete("/{store_id}/favorite", status_code=200)
def remove_store_from_favorites(
    store_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a store from user's favorites (requires authentication)
    """
    success = crud_favorite.remove_favorite(db, user_id=current_user.id, store_id=store_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Store not in favorites")
    
    return {"message": "Store removed from favorites", "store_id": store_id}


@router.get("/{store_id}/is-favorited", response_model=dict)
def check_if_store_is_favorited(
    store_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a store is in user's favorites (requires authentication)
    """
    is_favorited = crud_favorite.is_favorited(db, user_id=current_user.id, store_id=store_id)
    
    return {"store_id": store_id, "is_favorited": is_favorited}


@router.get("/favorites/my-favorites", response_model=List[Store])
def get_my_favorite_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's favorite stores (requires authentication)
    """
    favorites = crud_favorite.get_user_favorites(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return favorites


@router.get("/favorites/count", response_model=dict)
def get_my_favorites_count(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get count of user's favorite stores (requires authentication)
    """
    count = crud_favorite.get_favorite_count(db, user_id=current_user.id)
    
    return {"count": count}
