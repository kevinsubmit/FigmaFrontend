"""
Store Hours API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_store_admin
from app.models.user import User
from app.crud import store as crud_store, store_hours as crud_store_hours
from app.schemas.store_hours import StoreHours, StoreHoursCreate, StoreHoursBatch

router = APIRouter()


@router.get("/{store_id}/hours", response_model=List[StoreHours])
def get_store_hours(
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get store operating hours for all days of the week
    
    Returns hours for all 7 days (Monday=0 to Sunday=6)
    Public endpoint - no authentication required
    """
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    hours = crud_store_hours.get_store_hours(db, store_id=store_id)
    
    # If no hours set, return default hours (9:00-18:00, Monday-Saturday, Sunday closed)
    if not hours:
        return []
    
    return hours


@router.put("/{store_id}/hours", response_model=List[StoreHours])
def set_store_hours(
    store_id: int,
    hours_batch: StoreHoursBatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Set store operating hours for all 7 days (batch operation)
    
    - Super admin can set hours for any store
    - Store manager can only set hours for their own store
    
    This will replace all existing hours with the new ones
    """
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only set hours for your own store"
            )
    
    # Batch create or update hours
    result = crud_store_hours.batch_create_or_update_store_hours(
        db,
        store_id=store_id,
        hours_list=hours_batch.hours
    )
    
    return result


@router.post("/{store_id}/hours/{day_of_week}", response_model=StoreHours)
def create_or_update_store_hours_for_day(
    store_id: int,
    day_of_week: int,
    hours: StoreHoursCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Create or update store hours for a specific day
    
    - Super admin can set hours for any store
    - Store manager can only set hours for their own store
    - day_of_week: 0=Monday, 1=Tuesday, ..., 6=Sunday
    """
    # Validate day_of_week
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(status_code=400, detail="day_of_week must be between 0 and 6")
    
    # Check if store exists
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only set hours for your own store"
            )
    
    # Validate that day_of_week in request matches path parameter
    if hours.day_of_week != day_of_week:
        raise HTTPException(
            status_code=400,
            detail=f"day_of_week in request body ({hours.day_of_week}) must match path parameter ({day_of_week})"
        )
    
    # Check if hours already exist for this day
    existing_hours = crud_store_hours.get_store_hours_by_day(db, store_id, day_of_week)
    
    if existing_hours:
        # Update existing hours
        from app.schemas.store_hours import StoreHoursUpdate
        update_data = StoreHoursUpdate(
            open_time=hours.open_time,
            close_time=hours.close_time,
            is_closed=hours.is_closed
        )
        result = crud_store_hours.update_store_hours(db, store_id, day_of_week, update_data)
    else:
        # Create new hours
        result = crud_store_hours.create_store_hours(db, store_id, hours)
    
    return result
