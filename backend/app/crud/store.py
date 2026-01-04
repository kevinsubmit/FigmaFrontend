"""
Store CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.store import Store, StoreImage
from app.schemas.store import StoreCreate, StoreUpdate


def get_store(db: Session, store_id: int) -> Optional[Store]:
    """Get store by ID"""
    return db.query(Store).filter(Store.id == store_id).first()


def get_stores(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    city: Optional[str] = None,
    search: Optional[str] = None
) -> List[Store]:
    """Get list of stores with optional filters"""
    query = db.query(Store)
    
    if city:
        query = query.filter(Store.city == city)
    
    if search:
        query = query.filter(
            (Store.name.contains(search)) |
            (Store.address.contains(search))
        )
    
    return query.offset(skip).limit(limit).all()


def create_store(db: Session, store: StoreCreate) -> Store:
    """Create new store"""
    db_store = Store(**store.dict())
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store


def update_store(db: Session, store_id: int, store: StoreUpdate) -> Optional[Store]:
    """Update store"""
    db_store = get_store(db, store_id)
    if not db_store:
        return None
    
    update_data = store.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_store, field, value)
    
    db.commit()
    db.refresh(db_store)
    return db_store


def get_store_images(db: Session, store_id: int) -> List[StoreImage]:
    """Get store images"""
    return db.query(StoreImage).filter(
        StoreImage.store_id == store_id
    ).order_by(StoreImage.display_order).all()


def create_store_image(db: Session, store_id: int, image_url: str, is_primary: int = 0, display_order: int = 0) -> StoreImage:
    """Create store image"""
    db_image = StoreImage(
        store_id=store_id,
        image_url=image_url,
        is_primary=is_primary,
        display_order=display_order
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image
