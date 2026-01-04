"""
Stores API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_admin_user, get_current_store_admin
from app.models.user import User
from app.crud import store as crud_store, service as crud_service
from app.schemas.store import Store, StoreWithImages, StoreImage, StoreCreate, StoreUpdate, StoreImageCreate
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


@router.post("/", response_model=Store, status_code=201)
def create_store(
    store: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create a new store (Admin only)
    
    Requires admin permissions
    """
    new_store = crud_store.create_store(db, store=store)
    return new_store


@router.patch("/{store_id}", response_model=Store)
def update_store(
    store_id: int,
    store: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Update store information (Store admin only)
    
    - Super admin can update any store
    - Store manager can only update their own store
    """
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own store"
            )
    
    updated_store = crud_store.update_store(db, store_id=store_id, store=store)
    if not updated_store:
        raise HTTPException(status_code=404, detail="Store not found")
    return updated_store


@router.delete("/{store_id}", status_code=204)
def delete_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a store (Admin only)
    
    Requires admin permissions
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    crud_store.delete_store(db, store_id=store_id)
    return None


@router.post("/{store_id}/images", response_model=StoreImage, status_code=201)
def create_store_image(
    store_id: int,
    image_url: str,
    is_primary: int = 0,
    display_order: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Add an image to a store (Store admin only)
    
    - Super admin can add images to any store
    - Store manager can only add images to their own store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only add images to your own store"
            )
    
    new_image = crud_store.create_store_image(
        db,
        store_id=store_id,
        image_url=image_url,
        is_primary=is_primary,
        display_order=display_order
    )
    return new_image


@router.delete("/{store_id}/images/{image_id}", status_code=204)
def delete_store_image(
    store_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin)
):
    """
    Delete a store image (Store admin only)
    
    - Super admin can delete images from any store
    - Store manager can only delete images from their own store
    """
    store = crud_store.get_store(db, store_id=store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # If user is store manager (not super admin), enforce store ownership
    if not current_user.is_admin:
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete images from your own store"
            )
    
    deleted = crud_store.delete_store_image(db, image_id=image_id, store_id=store_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return None
