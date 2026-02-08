"""
Service and service catalog CRUD operations
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.service_catalog import ServiceCatalog
from app.schemas.service import (
    ServiceCatalogCreate,
    ServiceCatalogUpdate,
    ServiceCreate,
    ServiceUpdate,
    StoreServiceAssign,
    StoreServiceUpdate,
)


def get_service(db: Session, service_id: int) -> Optional[Service]:
    """Get service by ID"""
    return db.query(Service).filter(Service.id == service_id).first()


def get_services(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    category: Optional[str] = None,
    catalog_id: Optional[int] = None,
) -> List[Service]:
    """Get list of active services with optional filters"""
    query = db.query(Service).filter(Service.is_active == 1)

    if store_id is not None:
        query = query.filter(Service.store_id == store_id)

    if category:
        query = query.filter(Service.category == category)

    if catalog_id is not None:
        query = query.filter(Service.catalog_id == catalog_id)

    return query.offset(skip).limit(limit).all()


def get_store_services(db: Session, store_id: int, include_inactive: bool = False) -> List[Service]:
    """Get all services for a specific store"""
    # Only expose services linked to super-admin catalog.
    query = db.query(Service).filter(Service.store_id == store_id, Service.catalog_id.isnot(None))
    if not include_inactive:
        query = query.filter(Service.is_active == 1)
    return query.order_by(Service.id.desc()).all()


def create_service(db: Session, service: ServiceCreate) -> Service:
    """Create new service"""
    db_service = Service(**service.model_dump())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


def update_service(db: Session, service_id: int, service: ServiceUpdate) -> Optional[Service]:
    """Update service"""
    db_service = get_service(db, service_id=service_id)
    if not db_service:
        return None

    update_data = service.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_service, field, value)

    db.commit()
    db.refresh(db_service)
    return db_service


def get_service_categories(db: Session) -> List[str]:
    """Get list of unique service categories"""
    categories = (
        db.query(Service.category)
        .filter(Service.is_active == 1, Service.category.isnot(None))
        .distinct()
        .all()
    )
    return [cat[0] for cat in categories if cat[0]]


def delete_service(db: Session, service_id: int) -> bool:
    """Delete service"""
    db_service = get_service(db, service_id=service_id)
    if not db_service:
        return False

    db.delete(db_service)
    db.commit()
    return True


def get_catalog_item(db: Session, catalog_id: int) -> Optional[ServiceCatalog]:
    """Get service catalog item by id"""
    return db.query(ServiceCatalog).filter(ServiceCatalog.id == catalog_id).first()


def get_catalog_items(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    category: Optional[str] = None,
) -> List[ServiceCatalog]:
    """Get catalog list"""
    query = db.query(ServiceCatalog)
    if active_only:
        query = query.filter(ServiceCatalog.is_active == 1)
    if category:
        query = query.filter(ServiceCatalog.category == category)

    return query.order_by(ServiceCatalog.sort_order.asc(), ServiceCatalog.id.desc()).offset(skip).limit(limit).all()


def create_catalog_item(db: Session, payload: ServiceCatalogCreate) -> ServiceCatalog:
    """Create service catalog item"""
    item = ServiceCatalog(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_catalog_item(
    db: Session,
    catalog_id: int,
    payload: ServiceCatalogUpdate,
) -> Optional[ServiceCatalog]:
    """Update service catalog item"""
    item = get_catalog_item(db, catalog_id)
    if not item:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def assign_catalog_service_to_store(
    db: Session,
    store_id: int,
    payload: StoreServiceAssign,
) -> Service:
    """Create or update a store service from catalog with store-specific price/duration"""
    catalog_item = get_catalog_item(db, payload.catalog_id)
    if not catalog_item:
        raise ValueError("Catalog item not found")

    existing = (
        db.query(Service)
        .filter(Service.store_id == store_id, Service.catalog_id == payload.catalog_id)
        .first()
    )
    if existing:
        existing.price = payload.price
        existing.duration_minutes = payload.duration_minutes
        existing.description = payload.description if payload.description is not None else catalog_item.description
        existing.name = catalog_item.name
        existing.category = catalog_item.category
        existing.is_active = 1
        db.commit()
        db.refresh(existing)
        return existing

    db_service = Service(
        store_id=store_id,
        catalog_id=payload.catalog_id,
        name=catalog_item.name,
        category=catalog_item.category,
        description=payload.description if payload.description is not None else catalog_item.description,
        price=payload.price,
        duration_minutes=payload.duration_minutes,
        is_active=1,
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


def update_store_service(
    db: Session,
    service_id: int,
    payload: StoreServiceUpdate,
) -> Optional[Service]:
    """Update store-level service config"""
    service = get_service(db, service_id)
    if not service:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    return service


def deactivate_service(db: Session, service_id: int) -> Optional[Service]:
    """Soft deactivate service instead of deleting history rows."""
    service = get_service(db, service_id=service_id)
    if not service:
        return None
    service.is_active = 0
    db.commit()
    db.refresh(service)
    return service
