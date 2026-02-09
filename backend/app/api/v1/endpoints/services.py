"""
Services API endpoints
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_current_store_admin, get_db
from app.crud import service as crud_service
from app.models.user import User
from app.schemas.service import (
    Service,
    ServiceCatalog,
    ServiceCatalogCreate,
    ServiceCatalogUpdate,
    ServiceCreate,
    ServiceUpdate,
    StoreServiceAssign,
    StoreServiceUpdate,
)

router = APIRouter()


def _query_service_catalog(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    active_only: bool = Query(False),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud_service.get_catalog_items(
        db,
        skip=skip,
        limit=limit,
        active_only=active_only,
        category=category,
    )


@router.get("/catalog", response_model=List[ServiceCatalog])
def get_service_catalog(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    active_only: bool = Query(False),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public catalog endpoint kept for backward compatibility."""
    return _query_service_catalog(skip, limit, active_only, category, db)


@router.get("/admin/catalog", response_model=List[ServiceCatalog])
def get_service_catalog_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    active_only: bool = Query(False),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_store_admin),
):
    """Admin/store-admin catalog endpoint."""
    return _query_service_catalog(skip, limit, active_only, category, db)


@router.post("/admin/catalog", response_model=ServiceCatalog, status_code=201)
def create_service_catalog_item(
    payload: ServiceCatalogCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Create catalog item (super admin only)"""
    try:
        return crud_service.create_catalog_item(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/admin/catalog/{catalog_id}", response_model=ServiceCatalog)
def update_service_catalog_item(
    catalog_id: int,
    payload: ServiceCatalogUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Update catalog item (super admin only)"""
    try:
        item = crud_service.update_catalog_item(db, catalog_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Service catalog item not found")
    return item


@router.get("/stores/{store_id}", response_model=List[Service])
@router.get("/store/{store_id}", response_model=List[Service])
def get_store_services(
    store_id: int,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Get services of a specific store"""
    return crud_service.get_store_services(db, store_id=store_id, include_inactive=include_inactive)


@router.post("/stores/{store_id}", response_model=Service, status_code=201)
@router.post("/store/{store_id}", response_model=Service, status_code=201)
def add_service_to_store_from_catalog(
    store_id: int,
    payload: StoreServiceAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """Store admin adds a catalog service to own store, then sets price/duration"""
    if not current_user.is_admin and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="You can only manage services for your own store")

    try:
        return crud_service.assign_catalog_service_to_store(db, store_id=store_id, payload=payload)
    except ValueError as exc:
        message = str(exc)
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc


@router.patch("/stores/{store_id}/{service_id}", response_model=Service)
@router.patch("/store/{store_id}/{service_id}", response_model=Service)
def update_store_service(
    store_id: int,
    service_id: int,
    payload: StoreServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """Update store-level service settings (price/duration/active)"""
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if service.store_id != store_id:
        raise HTTPException(status_code=400, detail="Service does not belong to this store")

    if not current_user.is_admin and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="You can only manage services for your own store")

    updated = crud_service.update_store_service(db, service_id=service_id, payload=payload)
    return updated


@router.delete("/stores/{store_id}/{service_id}", status_code=204)
@router.delete("/store/{store_id}/{service_id}", status_code=204)
def remove_store_service(
    store_id: int,
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """Delete a store service"""
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if service.store_id != store_id:
        raise HTTPException(status_code=400, detail="Service does not belong to this store")

    if not current_user.is_admin and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="You can only manage services for your own store")

    crud_service.deactivate_service(db, service_id=service_id)
    return None


@router.get("/", response_model=List[Service])
def get_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    store_id: Optional[int] = None,
    category: Optional[str] = None,
    catalog_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Get list of services with optional filters

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **store_id**: Filter by store ID
    - **category**: Filter by service category
    - **catalog_id**: Filter by catalog item
    """
    services = crud_service.get_services(
        db,
        skip=skip,
        limit=limit,
        store_id=store_id,
        category=category,
        catalog_id=catalog_id,
    )
    return services


@router.get("/categories", response_model=List[str])
def get_service_categories(db: Session = Depends(get_db)):
    """Get list of all service categories"""
    categories = crud_service.get_service_categories(db)
    return categories


@router.get("/{service_id}", response_model=Service)
def get_service(service_id: int, db: Session = Depends(get_db)):
    """Get service details by ID"""
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    return service


@router.post("/", response_model=Service, status_code=201)
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Create a new service (legacy endpoint)

    - Super admin can create services for any store
    - Store manager can only create services for their own store
    """
    if not current_user.is_admin and service.store_id != current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="You can only create services for your own store",
        )

    new_service = crud_service.create_service(db, service=service)
    return new_service


@router.patch("/{service_id}", response_model=Service)
def update_service(
    service_id: int,
    service: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Update service information (legacy endpoint)

    - Super admin can update services from any store
    - Store manager can only update services from their own store
    """
    existing_service = crud_service.get_service(db, service_id=service_id)
    if not existing_service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not current_user.is_admin and existing_service.store_id != current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="You can only update services from your own store",
        )

    updated_service = crud_service.update_service(db, service_id=service_id, service=service)
    return updated_service


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Delete a service (legacy endpoint)

    - Super admin can delete services from any store
    - Store manager can only delete services from their own store
    """
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not current_user.is_admin and service.store_id != current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete services from your own store",
        )

    crud_service.deactivate_service(db, service_id=service_id)
    return None


@router.patch("/{service_id}/availability", response_model=Service)
def toggle_service_availability(
    service_id: int,
    is_active: int = Query(..., ge=0, le=1, description="0 for inactive, 1 for active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_store_admin),
):
    """
    Toggle service availability (legacy endpoint)

    - Super admin can toggle availability for services from any store
    - Store manager can only toggle availability for services from their own store
    """
    service = crud_service.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not current_user.is_admin and service.store_id != current_user.store_id:
        raise HTTPException(
            status_code=403,
            detail="You can only toggle availability for services from your own store",
        )

    updated_service = crud_service.update_service(
        db,
        service_id=service_id,
        service=ServiceUpdate(is_active=is_active),
    )
    return updated_service
