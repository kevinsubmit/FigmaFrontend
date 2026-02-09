"""
Pins (homepage feed) endpoints
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_current_user, get_db
from app.crud import pin as crud_pin
from app.crud import pin_favorite as crud_pin_favorite
from app.models.user import User
from app.schemas.pin import (
    HomeFeedThemeResponse,
    HomeFeedThemeUpdate,
    PinAdminCreate,
    PinAdminResponse,
    PinAdminUpdate,
    PinResponse,
    TagAdminCreate,
    TagAdminResponse,
    TagAdminUpdate,
)
from app.schemas.user import UserResponse

router = APIRouter()

PIN_STATUS_VALUES = {"draft", "published", "offline"}


def _to_pin_response(pin) -> PinResponse:
    return PinResponse(
        id=pin.id,
        title=pin.title,
        image_url=pin.image_url,
        description=pin.description,
        tags=[t.name for t in pin.tags if t.is_active],
        created_at=pin.created_at,
    )


def _to_pin_admin_response(pin) -> PinAdminResponse:
    return PinAdminResponse(
        id=pin.id,
        title=pin.title,
        image_url=pin.image_url,
        description=pin.description,
        status=pin.status,
        sort_order=pin.sort_order,
        is_deleted=pin.is_deleted,
        tag_ids=[t.id for t in pin.tags],
        tags=[t.name for t in pin.tags],
        created_at=pin.created_at,
        updated_at=pin.updated_at,
    )


@router.get("/tags", response_model=List[str])
def list_tags_public(db: Session = Depends(get_db)):
    tags = crud_pin.list_public_tags(db)
    return [tag.name for tag in tags]


@router.get("/", response_model=List[PinResponse])
def list_pins(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if not tag:
        theme_tag = crud_pin.get_active_theme_tag_name(db)
        if theme_tag:
            tag = theme_tag
    pins = crud_pin.get_pins(db, skip=skip, limit=limit, tag=tag, search=search)
    return [_to_pin_response(pin) for pin in pins]


@router.get("/admin/tags", response_model=List[TagAdminResponse])
def list_tags_admin(
    keyword: Optional[str] = Query(None),
    include_inactive: bool = Query(True),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    tags = crud_pin.list_admin_tags(
        db,
        keyword=keyword,
        include_inactive=include_inactive,
    )
    return tags


@router.post("/admin/tags", response_model=TagAdminResponse, status_code=201)
def create_tag_admin(
    payload: TagAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    try:
        tag = crud_pin.create_tag(
            db,
            name=payload.name,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
            show_on_home=payload.show_on_home,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return tag


@router.patch("/admin/tags/{tag_id}", response_model=TagAdminResponse)
def update_tag_admin(
    tag_id: int,
    payload: TagAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    try:
        tag = crud_pin.update_tag(
            db,
            tag_id=tag_id,
            name=payload.name,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
            show_on_home=payload.show_on_home,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/admin/tags/{tag_id}", status_code=204)
def delete_tag_admin(
    tag_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    success = crud_pin.deactivate_tag(db, tag_id=tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return None


@router.get("/admin", response_model=List[PinAdminResponse])
def list_pins_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    tag_id: Optional[int] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    if status and status not in PIN_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    pins = crud_pin.get_pins_admin(
        db,
        skip=skip,
        limit=limit,
        keyword=keyword,
        status=status,
        tag_id=tag_id,
        include_deleted=include_deleted,
    )
    return [_to_pin_admin_response(pin) for pin in pins]


@router.post("/admin", response_model=PinAdminResponse, status_code=201)
def create_pin_admin(
    payload: PinAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    if payload.status not in PIN_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.tag_ids:
        tags = crud_pin.get_tags_by_ids(db, payload.tag_ids)
        if len(tags) != len(set(payload.tag_ids)):
            raise HTTPException(status_code=400, detail="Some categories are invalid")

    pin = crud_pin.create_pin(
        db,
        title=payload.title,
        image_url=payload.image_url,
        description=payload.description,
        status=payload.status,
        sort_order=payload.sort_order,
        tag_ids=payload.tag_ids,
    )
    return _to_pin_admin_response(pin)


@router.patch("/admin/{pin_id}", response_model=PinAdminResponse)
def update_pin_admin(
    pin_id: int,
    payload: PinAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    if payload.status and payload.status not in PIN_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.tag_ids is not None and payload.tag_ids:
        tags = crud_pin.get_tags_by_ids(db, payload.tag_ids)
        if len(tags) != len(set(payload.tag_ids)):
            raise HTTPException(status_code=400, detail="Some categories are invalid")

    pin = crud_pin.update_pin(
        db,
        pin_id=pin_id,
        title=payload.title,
        image_url=payload.image_url,
        description=payload.description,
        status=payload.status,
        sort_order=payload.sort_order,
        tag_ids=payload.tag_ids,
    )
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    return _to_pin_admin_response(pin)


@router.delete("/admin/{pin_id}", status_code=204)
def delete_pin_admin(
    pin_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    success = crud_pin.soft_delete_pin(db, pin_id=pin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pin not found")
    return None


@router.get("/theme/public", response_model=HomeFeedThemeResponse)
def get_home_feed_theme_public(db: Session = Depends(get_db)):
    return crud_pin.get_home_feed_theme(db)


@router.get("/admin/theme", response_model=HomeFeedThemeResponse)
def get_home_feed_theme_admin(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    return crud_pin.get_home_feed_theme(db)


@router.put("/admin/theme", response_model=HomeFeedThemeResponse)
def update_home_feed_theme_admin(
    payload: HomeFeedThemeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    if payload.enabled and not payload.tag_id:
        raise HTTPException(status_code=400, detail="tag_id is required when enabling theme mode")
    if payload.start_at and payload.end_at and payload.start_at >= payload.end_at:
        raise HTTPException(status_code=400, detail="start_at must be earlier than end_at")
    if payload.tag_id:
        tag = crud_pin.get_tag(db, payload.tag_id)
        if not tag:
            raise HTTPException(status_code=400, detail="Invalid tag_id")
    return crud_pin.update_home_feed_theme(
        db,
        enabled=payload.enabled,
        tag_id=payload.tag_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        updated_by=current_user.id,
    )


@router.get("/{pin_id}", response_model=PinResponse)
def get_pin(pin_id: int, db: Session = Depends(get_db)):
    pin = crud_pin.get_pin(db, pin_id=pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    return _to_pin_response(pin)


@router.post("/{pin_id}/favorite", status_code=201)
def add_pin_to_favorites(
    pin_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
):
    success = crud_pin_favorite.remove_favorite(db, user_id=current_user.id, pin_id=pin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pin not in favorites")
    return {"message": "Pin removed from favorites", "pin_id": pin_id}


@router.get("/{pin_id}/is-favorited", response_model=dict)
def check_if_pin_is_favorited(
    pin_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_favorited = crud_pin_favorite.is_favorited(db, user_id=current_user.id, pin_id=pin_id)
    return {"pin_id": pin_id, "is_favorited": is_favorited}


@router.get("/favorites/my-favorites", response_model=List[PinResponse])
def get_my_favorite_pins(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = crud_pin_favorite.get_user_favorites(db, user_id=current_user.id, skip=skip, limit=limit)
    return [_to_pin_response(pin) for pin in favorites]


@router.get("/favorites/count", response_model=dict)
def get_my_favorite_pins_count(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = crud_pin_favorite.get_favorite_count(db, user_id=current_user.id)
    return {"count": count}
