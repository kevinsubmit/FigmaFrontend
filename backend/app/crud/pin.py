from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from app.models.pin import Pin, Tag


def get_pins(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    tag: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Pin]:
    query = db.query(Pin).options(selectinload(Pin.tags))

    if search:
        query = query.filter(
            or_(
                Pin.title.contains(search),
                Pin.description.contains(search),
            )
        )

    if tag:
        query = query.join(Pin.tags).filter(Tag.name == tag)

    return query.order_by(Pin.created_at.desc()).offset(skip).limit(limit).all()


def get_pin(db: Session, pin_id: int) -> Optional[Pin]:
    return (
        db.query(Pin)
        .options(selectinload(Pin.tags))
        .filter(Pin.id == pin_id)
        .first()
    )
