"""
Store CRUD operations
"""
from sqlalchemy import and_, case, func, literal, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
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
    has_location = user_lat is not None and user_lng is not None

    rating_expr = func.coalesce(Store.rating, 0.0)
    review_count_expr = func.coalesce(Store.review_count, 0.0)
    boost_score_expr = func.coalesce(Store.boost_score, 0.0)

    # SQL Haversine distance in miles. Exact distance values are still attached
    # to result rows below so API payloads stay unchanged.
    distance_miles_expr = None
    if has_location:
        user_lat_lit = literal(float(user_lat))
        user_lng_lit = literal(float(user_lng))
        lat_rad = func.radians(Store.latitude)
        lng_rad = func.radians(Store.longitude)
        user_lat_rad = func.radians(user_lat_lit)
        user_lng_rad = func.radians(user_lng_lit)

        dlat = lat_rad - user_lat_rad
        dlng = lng_rad - user_lng_rad
        haversine_a = (
            func.pow(func.sin(dlat / 2.0), 2.0)
            + func.cos(user_lat_rad) * func.cos(lat_rad) * func.pow(func.sin(dlng / 2.0), 2.0)
        )
        safe_haversine_a = case(
            (haversine_a < 0.0, 0.0),
            (haversine_a > 1.0, 1.0),
            else_=haversine_a,
        )
        distance_raw_expr = 3959.0 * 2.0 * func.asin(func.sqrt(safe_haversine_a))
        distance_miles_expr = case(
            (
                and_(Store.latitude.isnot(None), Store.longitude.isnot(None)),
                distance_raw_expr,
            ),
            else_=literal(999999.0),
        )

    review_confidence_expr = case(
        (review_count_expr / 100.0 > 1.0, 1.0),
        else_=review_count_expr / 100.0,
    )
    quality_score_expr = (rating_expr / 5.0) * (0.6 + 0.4 * review_confidence_expr)
    manual_rank_score_expr = case(
        (Store.manual_rank.is_(None), 0.0),
        (Store.manual_rank >= 200, 0.0),
        else_=1.0 - (Store.manual_rank / 200.0),
    )
    now_utc = datetime.now(timezone.utc)
    featured_bonus_expr = case(
        (
            and_(Store.featured_until.isnot(None), Store.featured_until > now_utc),
            0.2,
        ),
        else_=0.0,
    )

    if sort_by == "top_rated":
        query = query.order_by(
            Store.rating.desc(),
            Store.review_count.desc(),
            Store.manual_rank.asc().nullslast(),
        )
    elif sort_by == "distance" and has_location and distance_miles_expr is not None:
        query = query.order_by(
            distance_miles_expr.asc(),
            Store.manual_rank.asc().nullslast(),
            rating_expr.desc(),
        )
    else:
        # Default: "recommended"
        if has_location and distance_miles_expr is not None:
            distance_score_expr = case(
                (distance_miles_expr >= 20.0, 0.0),
                else_=1.0 - (distance_miles_expr / 20.0),
            )
            recommended_score_expr = (
                quality_score_expr * 0.55
                + distance_score_expr * 0.30
                + manual_rank_score_expr * 0.15
                + boost_score_expr
                + featured_bonus_expr
            )
        else:
            # Keep pre-existing no-location ranking behavior for compatibility.
            review_score_expr = case(
                (review_count_expr / 100.0 > 1.0, 1.0),
                else_=review_count_expr / 100.0,
            )
            manual_rank_no_loc_expr = case(
                (Store.manual_rank.is_(None), 0.0),
                else_=1.0 - (Store.manual_rank / 200.0),
            )
            recommended_score_expr = (
                rating_expr * 0.55
                + review_score_expr * 0.30
                + manual_rank_no_loc_expr * 0.15
                + boost_score_expr
            )
        query = query.order_by(
            recommended_score_expr.desc(),
            Store.manual_rank.asc().nullslast(),
            rating_expr.desc(),
        )

    stores = query.offset(skip).limit(limit).all()

    if has_location:
        lat1 = radians(float(user_lat))
        lng1 = radians(float(user_lng))
        for store in stores:
            if store.latitude is None or store.longitude is None:
                store.distance = None
                continue

            lat2 = radians(float(store.latitude))
            lng2 = radians(float(store.longitude))
            dlat = lat2 - lat1
            dlng = lng2 - lng1
            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
            c = 2 * asin(sqrt(a))
            store.distance = round(3959 * c, 1)

    return stores


def create_store(db: Session, store: StoreCreate) -> Store:
    """Create new store"""
    payload = store.model_dump()
    if not payload.get("time_zone"):
        payload["time_zone"] = "America/New_York"
    db_store = Store(**payload)
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store


def update_store(db: Session, store_id: int, store: StoreUpdate) -> Optional[Store]:
    """Update store"""
    db_store = get_store(db, store_id)
    if not db_store:
        return None
    
    update_data = store.model_dump(exclude_unset=True)
    if "time_zone" in update_data and not update_data.get("time_zone"):
        update_data["time_zone"] = "America/New_York"
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
