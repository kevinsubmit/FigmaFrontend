"""
Pin Favorite CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.pin_favorite import PinFavorite
from app.models.pin import Pin


def add_favorite(db: Session, user_id: int, pin_id: int) -> Optional[PinFavorite]:
    existing = db.query(PinFavorite).filter(
        PinFavorite.user_id == user_id,
        PinFavorite.pin_id == pin_id
    ).first()
    if existing:
        return None

    favorite = PinFavorite(user_id=user_id, pin_id=pin_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, user_id: int, pin_id: int) -> bool:
    favorite = db.query(PinFavorite).filter(
        PinFavorite.user_id == user_id,
        PinFavorite.pin_id == pin_id
    ).first()
    if not favorite:
        return False
    db.delete(favorite)
    db.commit()
    return True


def is_favorited(db: Session, user_id: int, pin_id: int) -> bool:
    favorite = db.query(PinFavorite).filter(
        PinFavorite.user_id == user_id,
        PinFavorite.pin_id == pin_id
    ).first()
    return favorite is not None


def get_user_favorites(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Pin]:
    return db.query(Pin).join(
        PinFavorite,
        Pin.id == PinFavorite.pin_id
    ).filter(
        PinFavorite.user_id == user_id
    ).offset(skip).limit(limit).all()


def get_favorite_count(db: Session, user_id: int) -> int:
    return db.query(PinFavorite).filter(
        PinFavorite.user_id == user_id
    ).count()
