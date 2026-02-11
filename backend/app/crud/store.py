"""
Store CRUD operations
"""
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
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
    user_lng: Optional[float] = None,
    include_hidden: bool = False,
) -> List[Store]:
    """Get list of stores with optional filters and sorting"""
    from sqlalchemy import case
    from math import radians, cos, sin, asin, sqrt
    
    query = db.query(Store)
    if not include_hidden:
        query = query.filter(or_(Store.is_visible.is_(True), Store.is_visible.is_(None)))
    
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
    
    # Calculate distance for all stores if user location is provided
    stores_with_distance = None
    if user_lat is not None and user_lng is not None:
        lat1 = radians(user_lat)
        lng1 = radians(user_lng)
        
        # Get all stores first
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
                
                # Attach distance to store object
                store.distance = round(distance, 1)
                stores_with_distance.append((store, distance))
            else:
                # If store doesn't have coordinates, put it at the end
                store.distance = None
                stores_with_distance.append((store, float('inf')))
    
    def rank_value(store: Store) -> int:
        return store.manual_rank if store.manual_rank is not None else 10**9

    def quality_score(store: Store) -> float:
        rating = float(store.rating or 0.0)
        review_count = float(store.review_count or 0.0)
        confidence = min(review_count / 100.0, 1.0)
        return (rating / 5.0) * (0.6 + 0.4 * confidence)

    def distance_score(distance: Optional[float]) -> float:
        if distance is None or distance == float("inf"):
            return 0.0
        return max(0.0, 1.0 - min(distance, 20.0) / 20.0)

    def manual_rank_score(store: Store) -> float:
        if store.manual_rank is None:
            return 0.0
        return max(0.0, 1.0 - min(float(store.manual_rank), 200.0) / 200.0)

    def featured_bonus(store: Store) -> float:
        if not store.featured_until:
            return 0.0
        try:
            feature_time = store.featured_until
            now = datetime.now(timezone.utc)
            if feature_time.tzinfo is None:
                feature_time = feature_time.replace(tzinfo=timezone.utc)
            return 0.2 if feature_time > now else 0.0
        except Exception:
            return 0.0

    # Sort results
    if sort_by == "top_rated":
        if stores_with_distance:
            # Keep top-rated as primary; manual rank as tie-breaker.
            stores_with_distance.sort(key=lambda x: (-x[0].rating, -x[0].review_count, rank_value(x[0])))
            sorted_stores = [s[0] for s in stores_with_distance]
            return sorted_stores[skip:skip+limit]
        else:
            query = query.order_by(Store.rating.desc(), Store.review_count.desc(), Store.manual_rank.asc().nullslast())
            return query.offset(skip).limit(limit).all()
    elif sort_by == "distance" and stores_with_distance:
        # Sort by distance
        stores_with_distance.sort(key=lambda x: (x[1], rank_value(x[0])))
        sorted_stores = [s[0] for s in stores_with_distance]
        return sorted_stores[skip:skip+limit]
    else:
        # Default: "recommended" - weighted hybrid score.
        if stores_with_distance:
            scored = []
            for store, distance in stores_with_distance:
                score = (
                    0.55 * quality_score(store)
                    + 0.30 * distance_score(distance)
                    + 0.15 * manual_rank_score(store)
                    + float(store.boost_score or 0.0)
                    + featured_bonus(store)
                )
                store.recommended_score = round(score, 4)
                scored.append((store, score))
            scored.sort(key=lambda x: (-x[1], rank_value(x[0]), -x[0].rating))
            sorted_stores = [s[0] for s in scored]
            return sorted_stores[skip:skip+limit]
        else:
            review_score = case(
                (Store.review_count / 100.0 > 1.0, 1.0),
                else_=Store.review_count / 100.0
            )
            manual_rank_score_expr = case(
                (Store.manual_rank.is_(None), 0.0),
                else_=1.0 - (Store.manual_rank / 200.0)
            )
            query = query.order_by(
                (Store.rating * 0.55 + review_score * 0.30 + manual_rank_score_expr * 0.15 + Store.boost_score).desc(),
                Store.manual_rank.asc().nullslast()
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
