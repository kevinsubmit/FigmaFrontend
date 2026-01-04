"""
Service CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


def get_service(db: Session, service_id: int) -> Optional[Service]:
    """Get service by ID"""
    return db.query(Service).filter(Service.id == service_id).first()


def get_services(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    category: Optional[str] = None
) -> List[Service]:
    """Get list of services with optional filters"""
    query = db.query(Service).filter(Service.is_active == 1)
    
    if store_id:
        query = query.filter(Service.store_id == store_id)
    
    if category:
        query = query.filter(Service.category == category)
    
    return query.offset(skip).limit(limit).all()


def get_store_services(db: Session, store_id: int) -> List[Service]:
    """Get all services for a specific store"""
    return db.query(Service).filter(
        Service.store_id == store_id,
        Service.is_active == 1
    ).all()


def create_service(db: Session, service: ServiceCreate) -> Service:
    """Create new service"""
    db_service = Service(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


def update_service(db: Session, service_id: int, service: ServiceUpdate) -> Optional[Service]:
    """Update service"""
    db_service = get_service(db, service_id)
    if not db_service:
        return None
    
    update_data = service.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_service, field, value)
    
    db.commit()
    db.refresh(db_service)
    return db_service


def get_service_categories(db: Session) -> List[str]:
    """Get list of unique service categories"""
    categories = db.query(Service.category).filter(
        Service.is_active == 1,
        Service.category.isnot(None)
    ).distinct().all()
    return [cat[0] for cat in categories if cat[0]]


def delete_service(db: Session, service_id: int) -> bool:
    """Delete service"""
    db_service = get_service(db, service_id)
    if not db_service:
        return False
    
    db.delete(db_service)
    db.commit()
    return True
