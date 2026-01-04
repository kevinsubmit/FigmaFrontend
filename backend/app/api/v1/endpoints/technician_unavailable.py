"""
Technician Unavailable API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.api.deps import get_db, get_current_store_admin
from app.models.user import User
from app.crud import technician as crud_technician
from app.crud import technician_unavailable as crud_unavailable
from app.schemas.technician_unavailable import (
    TechnicianUnavailable,
    TechnicianUnavailableCreate,
    TechnicianUnavailableUpdate
)

router = APIRouter()


@router.post("/{technician_id}/unavailable", response_model=TechnicianUnavailable, status_code=201)
def create_unavailable_period(
    technician_id: int,
    unavailable: TechnicianUnavailableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Create a new unavailable period for a technician (Store admin only)
    
    - Super admin can create unavailable periods for any technician
    - Store manager can only create unavailable periods for technicians in their store
    """
    # Check if technician exists
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only manage unavailable periods for technicians in your own store"
            )
    
    # Validate date range
    if unavailable.start_date > unavailable.end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date must be before or equal to end date"
        )
    
    # Validate time range if both are provided
    if unavailable.start_time and unavailable.end_time:
        if unavailable.start_time >= unavailable.end_time:
            raise HTTPException(
                status_code=400,
                detail="Start time must be before end time"
            )
    
    return crud_unavailable.create_unavailable_period(db, technician_id, unavailable)


@router.get("/{technician_id}/unavailable", response_model=List[TechnicianUnavailable])
def get_unavailable_periods(
    technician_id: int,
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get all unavailable periods for a technician (Public endpoint)
    
    - Returns all unavailable periods for the specified technician
    - Can be filtered by date range
    """
    # Check if technician exists
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    return crud_unavailable.get_unavailable_periods(db, technician_id, start_date, end_date)


@router.get("/{technician_id}/unavailable/{unavailable_id}", response_model=TechnicianUnavailable)
def get_unavailable_period(
    technician_id: int,
    unavailable_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific unavailable period (Public endpoint)
    """
    unavailable = crud_unavailable.get_unavailable_period(db, unavailable_id)
    if not unavailable or unavailable.technician_id != technician_id:
        raise HTTPException(status_code=404, detail="Unavailable period not found")
    
    return unavailable


@router.patch("/{technician_id}/unavailable/{unavailable_id}", response_model=TechnicianUnavailable)
def update_unavailable_period(
    technician_id: int,
    unavailable_id: int,
    unavailable: TechnicianUnavailableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update an unavailable period (Store admin only)
    
    - Super admin can update unavailable periods for any technician
    - Store manager can only update unavailable periods for technicians in their store
    """
    # Get existing unavailable period
    existing_unavailable = crud_unavailable.get_unavailable_period(db, unavailable_id)
    if not existing_unavailable or existing_unavailable.technician_id != technician_id:
        raise HTTPException(status_code=404, detail="Unavailable period not found")
    
    # Check technician ownership
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only manage unavailable periods for technicians in your own store"
            )
    
    # Validate date range if both are provided
    start_date = unavailable.start_date or existing_unavailable.start_date
    end_date = unavailable.end_date or existing_unavailable.end_date
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date must be before or equal to end date"
        )
    
    # Validate time range if both are provided
    start_time = unavailable.start_time if unavailable.start_time is not None else existing_unavailable.start_time
    end_time = unavailable.end_time if unavailable.end_time is not None else existing_unavailable.end_time
    if start_time and end_time and start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time"
        )
    
    return crud_unavailable.update_unavailable_period(db, unavailable_id, unavailable)


@router.delete("/{technician_id}/unavailable/{unavailable_id}", status_code=204)
def delete_unavailable_period(
    technician_id: int,
    unavailable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete an unavailable period (Store admin only)
    
    - Super admin can delete unavailable periods for any technician
    - Store manager can only delete unavailable periods for technicians in their store
    """
    # Get existing unavailable period
    existing_unavailable = crud_unavailable.get_unavailable_period(db, unavailable_id)
    if not existing_unavailable or existing_unavailable.technician_id != technician_id:
        raise HTTPException(status_code=404, detail="Unavailable period not found")
    
    # Check technician ownership
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if technician.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only manage unavailable periods for technicians in your own store"
            )
    
    crud_unavailable.delete_unavailable_period(db, unavailable_id)
    return None
