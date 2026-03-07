"""
Store Holidays API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.crud import store_holiday as crud_holiday
from app.schemas.store_holiday import StoreHoliday, StoreHolidayCreate, StoreHolidayUpdate

router = APIRouter()


def _ensure_can_manage_store_holiday(current_user: User, store_id: int) -> None:
    if current_user.is_admin:
        return

    if not current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="Only super admin or approved store admin can manage store holidays",
        )
    if current_user.store_admin_status != "approved":
        raise HTTPException(status_code=403, detail="Store admin is not approved")
    if int(current_user.store_id) != int(store_id):
        raise HTTPException(
            status_code=403,
            detail="You can only manage holidays for your own store",
        )


@router.get("/{store_id}", response_model=List[StoreHoliday])
def get_store_holidays(
    store_id: int,
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    db: Session = Depends(get_db)
):
    """
    Get holidays for a store (public endpoint)
    
    - **store_id**: Store ID
    - **start_date**: Optional start date filter
    - **end_date**: Optional end date filter
    """
    holidays = crud_holiday.get_store_holidays(
        db,
        store_id=store_id,
        start_date=start_date,
        end_date=end_date
    )
    return holidays


@router.get("/{store_id}/check/{check_date}", response_model=dict)
def check_holiday(
    store_id: int,
    check_date: date,
    db: Session = Depends(get_db)
):
    """
    Check if a specific date is a holiday
    
    - **store_id**: Store ID
    - **check_date**: Date to check
    """
    is_holiday = crud_holiday.is_holiday(db, store_id, check_date)
    return {"is_holiday": is_holiday, "date": check_date}


@router.post("/{store_id}", response_model=StoreHoliday)
def create_holiday(
    store_id: int,
    holiday_data: StoreHolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new holiday (requires authentication)
    
    - **store_id**: Store ID
    """
    _ensure_can_manage_store_holiday(current_user, store_id)
    holiday = crud_holiday.create_holiday(
        db,
        store_id=store_id,
        holiday_data=holiday_data
    )
    return holiday


@router.patch("/{holiday_id}", response_model=StoreHoliday)
def update_holiday(
    holiday_id: int,
    holiday_data: StoreHolidayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a holiday (requires authentication)
    
    - **holiday_id**: Holiday ID
    """
    existing = crud_holiday.get_holiday(db, holiday_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Holiday not found")
    _ensure_can_manage_store_holiday(current_user, existing.store_id)

    holiday = crud_holiday.update_holiday(
        db,
        holiday_id=holiday_id,
        holiday_data=holiday_data
    )

    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    return holiday


@router.delete("/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a holiday (requires authentication)
    
    - **holiday_id**: Holiday ID
    """
    existing = crud_holiday.get_holiday(db, holiday_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Holiday not found")
    _ensure_can_manage_store_holiday(current_user, existing.store_id)

    success = crud_holiday.delete_holiday(db, holiday_id)
    if not success:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    return None
