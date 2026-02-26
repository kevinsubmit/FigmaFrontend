"""
Promotions endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db, get_current_admin_user
from app.crud import promotion as crud_promotion
from app.models.promotion import PromotionScope
from app.schemas.promotion import PromotionCreate, PromotionUpdate, PromotionResponse
from app.models.user import User

router = APIRouter()


def _sanitize_promotion_image_url(image_url: Optional[str]) -> Optional[str]:
    if image_url is None:
        return None
    normalized = image_url.strip()
    if not normalized:
        return None
    lowered = normalized.lower()
    if lowered.startswith(("javascript:", "data:", "vbscript:")):
        raise HTTPException(status_code=400, detail="Invalid image_url scheme")
    if not (
        normalized.startswith("/uploads/")
        or lowered.startswith("http://")
        or lowered.startswith("https://")
    ):
        raise HTTPException(status_code=400, detail="image_url must be /uploads/* or http(s) URL")
    return normalized


@router.get("/", response_model=List[PromotionResponse])
def list_promotions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    store_id: Optional[int] = None,
    scope: Optional[PromotionScope] = None,
    active_only: bool = True,
    include_platform: bool = True,
    db: Session = Depends(get_db),
):
    promotions = crud_promotion.list_promotions(
        db,
        skip=skip,
        limit=limit,
        store_id=store_id,
        scope=scope,
        active_only=active_only,
        include_platform=include_platform,
    )
    return promotions


@router.get("/{promotion_id}", response_model=PromotionResponse)
def get_promotion(promotion_id: int, db: Session = Depends(get_db)):
    promotion = crud_promotion.get_promotion(db, promotion_id=promotion_id)
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return promotion


@router.post("/", response_model=PromotionResponse, status_code=201)
def create_promotion(
    payload: PromotionCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    if payload.scope == PromotionScope.PLATFORM:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if payload.store_id is not None:
            raise HTTPException(status_code=400, detail="Platform promotion must not set store_id")
    else:
        if payload.store_id is None:
            raise HTTPException(status_code=400, detail="Store promotion requires store_id")
        if not current_user.is_admin and payload.store_id != current_user.store_id:
            raise HTTPException(status_code=403, detail="Cannot manage other stores")

    service_rules = [rule.dict() for rule in payload.service_rules]
    try:
        crud_promotion.validate_service_rules(db, payload.store_id, service_rules)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    promotion_data = payload.dict(exclude={"service_rules"})
    promotion_data["image_url"] = _sanitize_promotion_image_url(promotion_data.get("image_url"))
    promotion = crud_promotion.create_promotion(db, promotion_data, service_rules=service_rules)
    return promotion


@router.put("/{promotion_id}", response_model=PromotionResponse)
def update_promotion(
    promotion_id: int,
    payload: PromotionUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    promotion = crud_promotion.get_promotion(db, promotion_id=promotion_id)
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    update_data = payload.dict(exclude_unset=True, exclude={"service_rules"})
    if "image_url" in update_data:
        update_data["image_url"] = _sanitize_promotion_image_url(update_data.get("image_url"))
    if "start_at" in update_data and "end_at" in update_data:
        if update_data["end_at"] <= update_data["start_at"]:
            raise HTTPException(status_code=400, detail="end_at must be after start_at")
    elif "start_at" in update_data and promotion.end_at <= update_data["start_at"]:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")
    elif "end_at" in update_data and update_data["end_at"] <= promotion.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    service_rules = None
    if payload.service_rules is not None:
        service_rules = [rule.dict() for rule in payload.service_rules]
        try:
            crud_promotion.validate_service_rules(db, promotion.store_id, service_rules)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    promotion = crud_promotion.update_promotion(db, promotion, update_data, service_rules=service_rules)
    return promotion
