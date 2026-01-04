"""
Store Hours CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.store_hours import StoreHours
from app.schemas.store_hours import StoreHoursCreate, StoreHoursUpdate


def get_store_hours(db: Session, store_id: int) -> List[StoreHours]:
    """Get all hours for a store (all 7 days)"""
    return db.query(StoreHours).filter(
        StoreHours.store_id == store_id
    ).order_by(StoreHours.day_of_week).all()


def get_store_hours_by_day(db: Session, store_id: int, day_of_week: int) -> Optional[StoreHours]:
    """Get hours for a specific day"""
    return db.query(StoreHours).filter(
        StoreHours.store_id == store_id,
        StoreHours.day_of_week == day_of_week
    ).first()


def create_store_hours(db: Session, store_id: int, hours: StoreHoursCreate) -> StoreHours:
    """Create hours for a specific day"""
    db_hours = StoreHours(
        store_id=store_id,
        day_of_week=hours.day_of_week,
        open_time=hours.open_time,
        close_time=hours.close_time,
        is_closed=hours.is_closed
    )
    db.add(db_hours)
    db.commit()
    db.refresh(db_hours)
    return db_hours


def update_store_hours(
    db: Session,
    store_id: int,
    day_of_week: int,
    hours: StoreHoursUpdate
) -> Optional[StoreHours]:
    """Update hours for a specific day"""
    db_hours = get_store_hours_by_day(db, store_id, day_of_week)
    if not db_hours:
        return None
    
    update_data = hours.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_hours, field, value)
    
    db.commit()
    db.refresh(db_hours)
    return db_hours


def delete_store_hours(db: Session, store_id: int, day_of_week: int) -> bool:
    """Delete hours for a specific day"""
    db_hours = get_store_hours_by_day(db, store_id, day_of_week)
    if not db_hours:
        return False
    
    db.delete(db_hours)
    db.commit()
    return True


def batch_create_or_update_store_hours(
    db: Session,
    store_id: int,
    hours_list: List[StoreHoursCreate]
) -> List[StoreHours]:
    """
    Batch create or update store hours for all 7 days
    Deletes existing hours and creates new ones
    """
    # Delete existing hours
    db.query(StoreHours).filter(StoreHours.store_id == store_id).delete()
    
    # Create new hours
    result = []
    for hours in hours_list:
        db_hours = StoreHours(
            store_id=store_id,
            day_of_week=hours.day_of_week,
            open_time=hours.open_time,
            close_time=hours.close_time,
            is_closed=hours.is_closed
        )
        db.add(db_hours)
        result.append(db_hours)
    
    db.commit()
    
    # Refresh all objects
    for db_hours in result:
        db.refresh(db_hours)
    
    return result


def get_store_hours_for_day(db: Session, store_id: int, day_of_week: int) -> Optional[dict]:
    """
    Get opening hours for a specific day
    Returns dict with open_time, close_time, is_closed
    Returns None if no hours set for this day
    """
    hours = get_store_hours_by_day(db, store_id, day_of_week)
    if not hours:
        return None
    
    return {
        "open_time": hours.open_time,
        "close_time": hours.close_time,
        "is_closed": hours.is_closed
    }
