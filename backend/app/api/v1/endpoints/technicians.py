"""
Technicians API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.crud import technician as crud_technician
from app.schemas.technician import Technician, TechnicianCreate, TechnicianUpdate

router = APIRouter()


@router.get("/", response_model=List[Technician])
def get_technicians(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of technicians with optional filters
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **store_id**: Filter by store ID
    """
    technicians = crud_technician.get_technicians(
        db,
        skip=skip,
        limit=limit,
        store_id=store_id
    )
    return technicians


@router.get("/{technician_id}", response_model=Technician)
def get_technician(
    technician_id: int,
    db: Session = Depends(get_db)
):
    """
    Get technician details by ID
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    return technician


@router.post("/", response_model=Technician, status_code=201)
def create_technician(
    technician: TechnicianCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create a new technician (Admin only)
    
    Requires admin permissions
    """
    new_technician = crud_technician.create_technician(db, technician=technician)
    return new_technician


@router.patch("/{technician_id}", response_model=Technician)
def update_technician(
    technician_id: int,
    technician: TechnicianUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update technician information (Admin only)
    
    Requires admin permissions
    """
    updated_technician = crud_technician.update_technician(
        db,
        technician_id=technician_id,
        technician=technician
    )
    if not updated_technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    return updated_technician


@router.delete("/{technician_id}", status_code=204)
def delete_technician(
    technician_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a technician (Admin only)
    
    Requires admin permissions
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    crud_technician.delete_technician(db, technician_id=technician_id)
    return None


@router.patch("/{technician_id}/availability", response_model=Technician)
def toggle_technician_availability(
    technician_id: int,
    is_active: int = Query(..., ge=0, le=1, description="0 for inactive, 1 for active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Toggle technician availability (Admin only)
    
    Requires admin permissions
    """
    technician = crud_technician.get_technician(db, technician_id=technician_id)
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    updated_technician = crud_technician.update_technician(
        db,
        technician_id=technician_id,
        technician=TechnicianUpdate(is_active=is_active)
    )
    return updated_technician
