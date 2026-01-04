"""
Services API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_admin_user, get_current_store_admin
from app.models.user import User
from app.crud import service as crud_service
from app.schemas.service import Service, ServiceCreate, ServiceUpdate

router = APIRouter()


@router.get("/", response_model=List[Service])
def get_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of services with optional filters
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **store_id**: Filter by store ID
    - **category**: Filter by service category
    """
    services = crud_service.get_services(
        db,
        skip=skip,
        limit=limit,
        store_id=store_id,
        category=category
    )
    return services


@router.get("/categories", response_model=List[str])
def get_service_categories(db: Session = Depends(get_db)):
    """
    Get list of all service categories
    """
    categories = crud_service.get_service_categories(db)
    return categories


@router.get("/{service_id}", response_model=Service)
def get_service(
    service_id: int,
    db: Session = Depends(get_db)
):
    """
    Get service details by ID
    """
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service


@router.post("/", response_model=Service, status_code=201)
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Create a new service (Store admin only)
    
    - Super admin can create services for any store
    - Store manager can only create services for their own store
    """
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only create services for your own store"
            )
    
    new_service = crud_service.create_service(db, service=service)
    return new_service


@router.patch("/{service_id}", response_model=Service)
def update_service(
    service_id: int,
    service: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update service information (Store admin only)
    
    - Super admin can update services from any store
    - Store manager can only update services from their own store
    """
    # Get existing service
    existing_service = crud_service.get_service(db, service_id=service_id)
    if not existing_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if existing_service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update services from your own store"
            )
    
    updated_service = crud_service.update_service(db, service_id=service_id, service=service)
    return updated_service


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete a service (Store admin only)
    
    - Super admin can delete services from any store
    - Store manager can only delete services from their own store
    """
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete services from your own store"
            )
    
    crud_service.delete_service(db, service_id=service_id)
    return None


@router.patch("/{service_id}/availability", response_model=Service)
def toggle_service_availability(
    service_id: int,
    is_active: int = Query(..., ge=0, le=1, description="0 for inactive, 1 for active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Toggle service availability (Store admin only)
    
    - Super admin can toggle availability for services from any store
    - Store manager can only toggle availability for services from their own store
    """
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if service.store_id != current_user.store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only toggle availability for services from your own store"
            )
    
    updated_service = crud_service.update_service(
        db,
        service_id=service_id,
        service=ServiceUpdate(is_active=is_active)
    )
    return updated_service
