"""
Store Favorite CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.store_favorite import StoreFavorite
from app.models.store import Store


def add_favorite(db: Session, user_id: int, store_id: int) -> Optional[StoreFavorite]:
    """
    Add a store to user's favorites
    Returns None if already favorited
    """
    # Check if already favorited
    existing = db.query(StoreFavorite).filter(
        StoreFavorite.user_id == user_id,
        StoreFavorite.store_id == store_id
    ).first()
    
    if existing:
        return None
    
    # Create new favorite
    favorite = StoreFavorite(
        user_id=user_id,
        store_id=store_id
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, user_id: int, store_id: int) -> bool:
    """
    Remove a store from user's favorites
    Returns True if removed, False if not found
    """
    favorite = db.query(StoreFavorite).filter(
        StoreFavorite.user_id == user_id,
        StoreFavorite.store_id == store_id
    ).first()
    
    if not favorite:
        return False
    
    db.delete(favorite)
    db.commit()
    return True


def is_favorited(db: Session, user_id: int, store_id: int) -> bool:
    """
    Check if a store is favorited by user
    """
    favorite = db.query(StoreFavorite).filter(
        StoreFavorite.user_id == user_id,
        StoreFavorite.store_id == store_id
    ).first()
    
    return favorite is not None


def get_user_favorites(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Store]:
    """
    Get user's favorite stores
    """
    favorites = db.query(Store).join(
        StoreFavorite,
        Store.id == StoreFavorite.store_id
    ).filter(
        StoreFavorite.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    return favorites


def get_favorite_count(db: Session, user_id: int) -> int:
    """
    Get count of user's favorite stores
    """
    return db.query(StoreFavorite).filter(
        StoreFavorite.user_id == user_id
    ).count()


def get_store_favorite_count(db: Session, store_id: int) -> int:
    """
    Get count of users who favorited a store
    """
    return db.query(StoreFavorite).filter(
        StoreFavorite.store_id == store_id
    ).count()
