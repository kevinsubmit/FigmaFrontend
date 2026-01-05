"""
Store Holiday CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.models.store_holiday import StoreHoliday
from app.schemas.store_holiday import StoreHolidayCreate, StoreHolidayUpdate


def get_store_holidays(
    db: Session,
    store_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[StoreHoliday]:
    """Get holidays for a store, optionally filtered by date range"""
    query = db.query(StoreHoliday).filter(StoreHoliday.store_id == store_id)
    
    if start_date:
        query = query.filter(StoreHoliday.holiday_date >= start_date)
    if end_date:
        query = query.filter(StoreHoliday.holiday_date <= end_date)
    
    return query.order_by(StoreHoliday.holiday_date.asc()).all()


def get_holiday(db: Session, holiday_id: int) -> Optional[StoreHoliday]:
    """Get a specific holiday"""
    return db.query(StoreHoliday).filter(StoreHoliday.id == holiday_id).first()


def is_holiday(db: Session, store_id: int, check_date: date) -> bool:
    """Check if a specific date is a holiday for the store"""
    holiday = db.query(StoreHoliday).filter(
        StoreHoliday.store_id == store_id,
        StoreHoliday.holiday_date == check_date
    ).first()
    return holiday is not None


def create_holiday(
    db: Session,
    store_id: int,
    holiday_data: StoreHolidayCreate
) -> StoreHoliday:
    """Create a new holiday"""
    holiday = StoreHoliday(
        store_id=store_id,
        **holiday_data.model_dump()
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


def update_holiday(
    db: Session,
    holiday_id: int,
    holiday_data: StoreHolidayUpdate
) -> Optional[StoreHoliday]:
    """Update a holiday"""
    holiday = get_holiday(db, holiday_id)
    if not holiday:
        return None
    
    update_data = holiday_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(holiday, field, value)
    
    db.commit()
    db.refresh(holiday)
    return holiday


def delete_holiday(db: Session, holiday_id: int) -> bool:
    """Delete a holiday"""
    holiday = get_holiday(db, holiday_id)
    if not holiday:
        return False
    
    db.delete(holiday)
    db.commit()
    return True
