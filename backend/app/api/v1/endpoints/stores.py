"""
Stores API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db
from app.crud import store as crud_store, service as crud_service
from app.schemas.store import Store, StoreWithImages, StoreImage
from app.schemas.service import Service

router = APIRouter()


@router.get("/", response_model=List[Store])
def get_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    city: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of stores with optional filters
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **city**: Filter by city name
    - **search**: Search in store name and address
    """
    stores = crud_store.get_stores(db, skip=skip, limit=limit, city=city, search=search)
    return stores


@router.get("/{store_id}", response_model=StoreWithImages)
def get_store(
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get store details by ID including images
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
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
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get store images
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    images = crud_store.get_store_images(db, store_id=store_id)
    return images


@router.get("/{store_id}/services", response_model=List[Service])
def get_store_services(
    store_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all services offered by a store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    services = crud_service.get_store_services(db, store_id=store_id)
    return services
