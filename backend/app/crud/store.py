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
    sort_by: Optional[str] = "recommended",
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None
) -> List[Store]:
    """Get list of stores with optional filters and sorting"""
    from sqlalchemy import func, case
    from math import radians, cos, sin, asin, sqrt
    
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
    if sort_by == "top_rated":
        # Sort by rating (highest first), then by review count
        query = query.order_by(Store.rating.desc(), Store.review_count.desc())
    elif sort_by == "distance" and user_lat is not None and user_lng is not None:
        # Calculate distance using Haversine formula
        # Note: This is a simplified version. For production, consider using PostGIS
        lat1 = radians(user_lat)
        lng1 = radians(user_lng)
        
        # Get all stores first (since we need to calculate distance in Python)
        stores = query.all()
        
        # Calculate distance for each store
        stores_with_distance = []
        for store in stores:
            if store.latitude and store.longitude:
                lat2 = radians(store.latitude)
                lng2 = radians(store.longitude)
                
                # Haversine formula
                dlat = lat2 - lat1
                dlng = lng2 - lng1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
                c = 2 * asin(sqrt(a))
                distance = 3959 * c  # Radius of earth in miles
                
                stores_with_distance.append((store, distance))
            else:
                # If store doesn't have coordinates, put it at the end
                stores_with_distance.append((store, float('inf')))
        
        # Sort by distance
        stores_with_distance.sort(key=lambda x: x[1])
        
        # Extract stores and apply pagination
        sorted_stores = [s[0] for s in stores_with_distance]
        return sorted_stores[skip:skip+limit]
    else:
        # Default: "recommended" - Sort by a combination of rating and review count
        # Formula: (rating * 0.7) + (normalized_review_count * 0.3)
        # This gives more weight to rating but also considers popularity
        query = query.order_by(
            (Store.rating * 0.7 + func.least(Store.review_count / 100.0, 1.0) * 0.3).desc()
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
