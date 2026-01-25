"""
Promotion CRUD operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime

from app.models.promotion import Promotion, PromotionService, PromotionScope
from app.models.service import Service


def get_promotion(db: Session, promotion_id: int) -> Optional[Promotion]:
    """Get promotion by ID"""
    return db.query(Promotion).filter(Promotion.id == promotion_id).first()


def list_promotions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    store_id: Optional[int] = None,
    scope: Optional[PromotionScope] = None,
    active_only: bool = True,
    include_platform: bool = True,
) -> List[Promotion]:
    """List promotions with optional filters"""
    query = db.query(Promotion)

    if store_id is not None:
        if include_platform:
            query = query.filter(
                or_(
                    and_(Promotion.scope == PromotionScope.STORE, Promotion.store_id == store_id),
                    Promotion.scope == PromotionScope.PLATFORM
                )
            )
        else:
            query = query.filter(Promotion.store_id == store_id)

    if scope is not None:
        query = query.filter(Promotion.scope == scope)

    if active_only:
        now = datetime.utcnow()
        query = query.filter(
            and_(
                Promotion.is_active == True,
                Promotion.start_at <= now,
                Promotion.end_at >= now
            )
        )

    return query.order_by(Promotion.start_at.desc()).offset(skip).limit(limit).all()


def create_promotion(
    db: Session,
    promotion_data: dict,
    service_rules: Optional[List[dict]] = None
) -> Promotion:
    """Create promotion with service rules"""
    promotion = Promotion(**promotion_data)
    db.add(promotion)
    db.flush()

    if service_rules:
        for rule in service_rules:
            db.add(PromotionService(promotion_id=promotion.id, **rule))

    db.commit()
    db.refresh(promotion)
    return promotion


def update_promotion(
    db: Session,
    promotion: Promotion,
    update_data: dict,
    service_rules: Optional[List[dict]] = None
) -> Promotion:
    """Update promotion and optionally replace rules"""
    for field, value in update_data.items():
        setattr(promotion, field, value)

    if service_rules is not None:
        db.query(PromotionService).filter(
            PromotionService.promotion_id == promotion.id
        ).delete()
        for rule in service_rules:
            db.add(PromotionService(promotion_id=promotion.id, **rule))

    db.commit()
    db.refresh(promotion)
    return promotion


def validate_service_rules(
    db: Session,
    store_id: Optional[int],
    rules: List[dict]
) -> None:
    """Validate service rules and store ownership"""
    service_ids = {rule["service_id"] for rule in rules}
    if not service_ids:
        return

    services = db.query(Service).filter(Service.id.in_(service_ids)).all()
    found_ids = {service.id for service in services}

    missing = service_ids - found_ids
    if missing:
        raise ValueError(f"Services not found: {sorted(missing)}")

    if store_id is not None:
        invalid = [service.id for service in services if service.store_id != store_id]
        if invalid:
            raise ValueError(f"Services not in store {store_id}: {sorted(invalid)}")
