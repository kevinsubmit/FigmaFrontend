"""
CRUD operations for Technician Unavailable
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.models.technician_unavailable import TechnicianUnavailable
from app.schemas.technician_unavailable import TechnicianUnavailableCreate, TechnicianUnavailableUpdate


def create_unavailable_period(
    db: Session,
    technician_id: int,
    unavailable: TechnicianUnavailableCreate
) -> TechnicianUnavailable:
    """Create a new unavailable period for a technician"""
    db_unavailable = TechnicianUnavailable(
        technician_id=technician_id,
        **unavailable.dict()
    )
    db.add(db_unavailable)
    db.commit()
    db.refresh(db_unavailable)
    return db_unavailable


def get_unavailable_periods(
    db: Session,
    technician_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[TechnicianUnavailable]:
    """Get all unavailable periods for a technician"""
    query = db.query(TechnicianUnavailable).filter(
        TechnicianUnavailable.technician_id == technician_id
    )
    
    # Filter by date range if provided
    if start_date:
        query = query.filter(TechnicianUnavailable.end_date >= start_date)
    if end_date:
        query = query.filter(TechnicianUnavailable.start_date <= end_date)
    
    return query.order_by(TechnicianUnavailable.start_date).all()


def get_unavailable_period(
    db: Session,
    unavailable_id: int
) -> Optional[TechnicianUnavailable]:
    """Get a specific unavailable period by ID"""
    return db.query(TechnicianUnavailable).filter(
        TechnicianUnavailable.id == unavailable_id
    ).first()


def update_unavailable_period(
    db: Session,
    unavailable_id: int,
    unavailable: TechnicianUnavailableUpdate
) -> Optional[TechnicianUnavailable]:
    """Update an unavailable period"""
    db_unavailable = get_unavailable_period(db, unavailable_id)
    if not db_unavailable:
        return None
    
    update_data = unavailable.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_unavailable, field, value)
    
    db.commit()
    db.refresh(db_unavailable)
    return db_unavailable


def delete_unavailable_period(
    db: Session,
    unavailable_id: int
) -> bool:
    """Delete an unavailable period"""
    db_unavailable = get_unavailable_period(db, unavailable_id)
    if not db_unavailable:
        return False
    
    db.delete(db_unavailable)
    db.commit()
    return True


def check_technician_unavailable(
    db: Session,
    technician_id: int,
    check_date: date,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
) -> bool:
    """
    Check if a technician is unavailable on a specific date/time
    Returns True if unavailable, False if available
    """
    from datetime import datetime, time as time_type
    
    # Get all unavailable periods that overlap with the check date
    unavailable_periods = db.query(TechnicianUnavailable).filter(
        TechnicianUnavailable.technician_id == technician_id,
        TechnicianUnavailable.start_date <= check_date,
        TechnicianUnavailable.end_date >= check_date
    ).all()
    
    if not unavailable_periods:
        return False
    
    # If no time specified, check if the entire day is unavailable
    if start_time is None or end_time is None:
        # If any period covers the entire day (no start_time/end_time), technician is unavailable
        for period in unavailable_periods:
            if period.start_time is None or period.end_time is None:
                return True
        return False
    
    # Convert time strings to time objects for comparison
    if isinstance(start_time, str):
        start_time = datetime.strptime(start_time, "%H:%M:%S").time()
    if isinstance(end_time, str):
        end_time = datetime.strptime(end_time, "%H:%M:%S").time()
    
    # Check if the requested time overlaps with any unavailable period
    for period in unavailable_periods:
        # If period has no time constraints, entire day is unavailable
        if period.start_time is None or period.end_time is None:
            return True
        
        # Check time overlap
        if (start_time < period.end_time and end_time > period.start_time):
            return True
    
    return False
