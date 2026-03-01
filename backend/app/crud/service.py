"""
Service and service catalog CRUD operations
"""
from typing import List, Optional

from sqlalchemy import func
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


def _normalize_commission_payload(
    *,
    commission_type: Optional[str],
    commission_value: Optional[float],
    commission_amount: Optional[float],
    current_type: str = Service.COMMISSION_TYPE_FIXED,
    current_value: float = 0.0,
) -> tuple[str, float, float]:
    normalized_type = (commission_type or current_type or Service.COMMISSION_TYPE_FIXED).strip().lower()
    if normalized_type not in {Service.COMMISSION_TYPE_FIXED, Service.COMMISSION_TYPE_PERCENT}:
        raise ValueError("commission_type must be fixed or percent")

    if commission_value is None:
        if commission_amount is not None:
            normalized_value = float(commission_amount)
        else:
            normalized_value = float(current_value or 0)
    else:
        normalized_value = float(commission_value)

    if normalized_value < 0:
        raise ValueError("commission_value must be greater than or equal to 0")
    if normalized_type == Service.COMMISSION_TYPE_PERCENT and normalized_value > 100:
        raise ValueError("commission_value cannot exceed 100 for percent commission")

    legacy_amount = normalized_value if normalized_type == Service.COMMISSION_TYPE_FIXED else 0.0
    return normalized_type, normalized_value, legacy_amount


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
    # Expose all store services (including legacy services without catalog linkage).
    query = db.query(Service).filter(Service.store_id == store_id)
    if not include_inactive:
        query = query.filter(Service.is_active == 1)
    return query.order_by(Service.id.desc()).all()


def create_service(db: Session, service: ServiceCreate) -> Service:
    """Create new service"""
    payload = service.model_dump()
    provided_data = service.model_dump(exclude_unset=True)
    commission_type, commission_value, commission_amount = _normalize_commission_payload(
        commission_type=provided_data.get("commission_type"),
        commission_value=provided_data.get("commission_value"),
        commission_amount=provided_data.get("commission_amount"),
    )
    payload["commission_type"] = commission_type
    payload["commission_value"] = commission_value
    payload["commission_amount"] = commission_amount
    db_service = Service(**payload)
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
    if any(field in update_data for field in {"commission_type", "commission_value", "commission_amount"}):
        commission_type, commission_value, commission_amount = _normalize_commission_payload(
            commission_type=update_data.get("commission_type"),
            commission_value=update_data.get("commission_value"),
            commission_amount=update_data.get("commission_amount"),
            current_type=db_service.commission_type,
            current_value=(
                db_service.commission_value
                if db_service.commission_value is not None
                else float(db_service.commission_amount or 0)
            ),
        )
        update_data["commission_type"] = commission_type
        update_data["commission_value"] = commission_value
        update_data["commission_amount"] = commission_amount

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


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized.lower() if normalized else None


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
    normalized_name = _normalize_text(payload.name)
    normalized_category = _normalize_text(payload.category)

    duplicate_name = (
        db.query(ServiceCatalog.id)
        .filter(func.lower(func.trim(ServiceCatalog.name)) == normalized_name)
        .first()
    )
    if duplicate_name:
        raise ValueError("Service name already exists")

    if normalized_category:
        duplicate_category = (
            db.query(ServiceCatalog.id)
            .filter(
                ServiceCatalog.category.isnot(None),
                func.lower(func.trim(ServiceCatalog.category)) == normalized_category,
            )
            .first()
        )
        if duplicate_category:
            raise ValueError("Category already exists")

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

    update_data = payload.model_dump(exclude_unset=True)
    next_name = update_data.get("name", item.name)
    next_category = update_data.get("category", item.category)
    normalized_name = _normalize_text(next_name)
    normalized_category = _normalize_text(next_category)

    duplicate_name = (
        db.query(ServiceCatalog.id)
        .filter(
            ServiceCatalog.id != catalog_id,
            func.lower(func.trim(ServiceCatalog.name)) == normalized_name,
        )
        .first()
    )
    if duplicate_name:
        raise ValueError("Service name already exists")

    if normalized_category:
        duplicate_category = (
            db.query(ServiceCatalog.id)
            .filter(
                ServiceCatalog.id != catalog_id,
                ServiceCatalog.category.isnot(None),
                func.lower(func.trim(ServiceCatalog.category)) == normalized_category,
            )
            .first()
        )
        if duplicate_category:
            raise ValueError("Category already exists")

    for field, value in update_data.items():
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
    provided_data = payload.model_dump(exclude_unset=True)

    existing = (
        db.query(Service)
        .filter(Service.store_id == store_id, Service.catalog_id == payload.catalog_id)
        .first()
    )
    if existing:
        commission_type, commission_value, commission_amount = _normalize_commission_payload(
            commission_type=provided_data.get("commission_type"),
            commission_value=provided_data.get("commission_value"),
            commission_amount=provided_data.get("commission_amount"),
            current_type=existing.commission_type,
            current_value=(
                existing.commission_value
                if existing.commission_value is not None
                else float(existing.commission_amount or 0)
            ),
        )
        existing.price = payload.price
        existing.commission_type = commission_type
        existing.commission_value = commission_value
        existing.commission_amount = commission_amount
        existing.duration_minutes = payload.duration_minutes
        existing.description = payload.description if payload.description is not None else catalog_item.description
        existing.name = catalog_item.name
        existing.category = catalog_item.category
        existing.is_active = 1
        db.commit()
        db.refresh(existing)
        return existing

    commission_type, commission_value, commission_amount = _normalize_commission_payload(
        commission_type=provided_data.get("commission_type"),
        commission_value=provided_data.get("commission_value"),
        commission_amount=provided_data.get("commission_amount"),
    )

    db_service = Service(
        store_id=store_id,
        catalog_id=payload.catalog_id,
        name=catalog_item.name,
        category=catalog_item.category,
        description=payload.description if payload.description is not None else catalog_item.description,
        price=payload.price,
        commission_type=commission_type,
        commission_value=commission_value,
        commission_amount=commission_amount,
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
    if any(field in update_data for field in {"commission_type", "commission_value", "commission_amount"}):
        commission_type, commission_value, commission_amount = _normalize_commission_payload(
            commission_type=update_data.get("commission_type"),
            commission_value=update_data.get("commission_value"),
            commission_amount=update_data.get("commission_amount"),
            current_type=service.commission_type,
            current_value=(
                service.commission_value
                if service.commission_value is not None
                else float(service.commission_amount or 0)
            ),
        )
        update_data["commission_type"] = commission_type
        update_data["commission_value"] = commission_value
        update_data["commission_amount"] = commission_amount

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
