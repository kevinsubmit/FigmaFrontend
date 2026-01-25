"""
Pins (inspiration) endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.crud import pin as crud_pin
from app.crud import pin_favorite as crud_pin_favorite
from app.schemas.pin import PinResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/", response_model=List[PinResponse])
def list_pins(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    pins = crud_pin.get_pins(db, skip=skip, limit=limit, tag=tag, search=search)
    return [
        PinResponse(
            id=pin.id,
            title=pin.title,
            image_url=pin.image_url,
            description=pin.description,
            tags=[t.name for t in pin.tags],
            created_at=pin.created_at,
        )
        for pin in pins
    ]


@router.get("/{pin_id}", response_model=PinResponse)
def get_pin(pin_id: int, db: Session = Depends(get_db)):
    pin = crud_pin.get_pin(db, pin_id=pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    return PinResponse(
        id=pin.id,
        title=pin.title,
        image_url=pin.image_url,
        description=pin.description,
        tags=[t.name for t in pin.tags],
        created_at=pin.created_at,
    )


@router.post("/{pin_id}/favorite", status_code=201)
def add_pin_to_favorites(
    pin_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pin = crud_pin.get_pin(db, pin_id=pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")

    favorite = crud_pin_favorite.add_favorite(db, user_id=current_user.id, pin_id=pin_id)
    if not favorite:
        raise HTTPException(status_code=400, detail="Pin already in favorites")

    return {"message": "Pin added to favorites", "pin_id": pin_id}


@router.delete("/{pin_id}/favorite", status_code=200)
def remove_pin_from_favorites(
    pin_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = crud_pin_favorite.remove_favorite(db, user_id=current_user.id, pin_id=pin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pin not in favorites")
    return {"message": "Pin removed from favorites", "pin_id": pin_id}


@router.get("/{pin_id}/is-favorited", response_model=dict)
def check_if_pin_is_favorited(
    pin_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_favorited = crud_pin_favorite.is_favorited(db, user_id=current_user.id, pin_id=pin_id)
    return {"pin_id": pin_id, "is_favorited": is_favorited}


@router.get("/favorites/my-favorites", response_model=List[PinResponse])
def get_my_favorite_pins(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favorites = crud_pin_favorite.get_user_favorites(db, user_id=current_user.id, skip=skip, limit=limit)
    return [
        PinResponse(
            id=pin.id,
            title=pin.title,
            image_url=pin.image_url,
            description=pin.description,
            tags=[t.name for t in pin.tags],
            created_at=pin.created_at,
        )
        for pin in favorites
    ]


@router.get("/favorites/count", response_model=dict)
def get_my_favorite_pins_count(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = crud_pin_favorite.get_favorite_count(db, user_id=current_user.id)
    return {"count": count}
