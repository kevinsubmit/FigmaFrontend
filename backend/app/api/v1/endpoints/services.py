"""
Services API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db
from app.crud import service as crud_service
from app.schemas.service import Service

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
