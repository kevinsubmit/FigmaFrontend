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
    search: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort_by: Optional[str] = None
) -> List[Store]:
    """Get list of stores with optional filters and sorting"""
    query = db.query(Store)
    
    # Filter by city
    if city:
        query = query.filter(Store.city == city)
    
    # Search in name and address
    if search:
        query = query.filter(
            (Store.name.contains(search)) |
            (Store.address.contains(search))
        )
    
    # Filter by minimum rating
    if min_rating is not None:
        query = query.filter(Store.rating >= min_rating)
    
    # Sort results
    if sort_by == "rating_desc":
        query = query.order_by(Store.rating.desc())
    elif sort_by == "rating_asc":
        query = query.order_by(Store.rating.asc())
    elif sort_by == "name_asc":
        query = query.order_by(Store.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(Store.name.desc())
    elif sort_by == "review_count_desc":
        query = query.order_by(Store.review_count.desc())
    else:
        # Default: sort by rating descending
        query = query.order_by(Store.rating.desc())
    
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


def delete_store(db: Session, store_id: int) -> bool:
    """Delete store"""
    db_store = get_store(db, store_id)
    if not db_store:
        return False
    
    # Delete associated images first
    db.query(StoreImage).filter(StoreImage.store_id == store_id).delete()
    
    # Delete store
    db.delete(db_store)
    db.commit()
    return True


def delete_store_image(db: Session, image_id: int, store_id: int) -> bool:
    """Delete store image"""
    db_image = db.query(StoreImage).filter(
        StoreImage.id == image_id,
        StoreImage.store_id == store_id
    ).first()
    
    if not db_image:
        return False
    
    db.delete(db_image)
    db.commit()
    return True
