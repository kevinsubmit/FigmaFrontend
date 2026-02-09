from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_
from app.models.pin import Pin, Tag


def get_pins(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    tag: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Pin]:
    query = db.query(Pin).options(selectinload(Pin.tags)).filter(
        Pin.is_deleted.is_(False),
        Pin.status == "published",
    )

    if search:
        query = query.filter(
            or_(
                Pin.title.contains(search),
                Pin.description.contains(search),
            )
        )

    if tag:
        query = query.join(Pin.tags).filter(Tag.name == tag, Tag.is_active.is_(True))

    return (
        query.order_by(Pin.sort_order.asc(), Pin.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_pin(db: Session, pin_id: int) -> Optional[Pin]:
    return (
        db.query(Pin)
        .options(selectinload(Pin.tags))
        .filter(Pin.id == pin_id, Pin.is_deleted.is_(False))
        .first()
    )


def list_public_tags(db: Session) -> List[Tag]:
    return (
        db.query(Tag)
        .filter(Tag.is_active.is_(True))
        .order_by(Tag.sort_order.asc(), Tag.name.asc())
        .all()
    )


def list_admin_tags(
    db: Session,
    *,
    keyword: Optional[str] = None,
    include_inactive: bool = True,
) -> List[Tag]:
    query = db.query(Tag)
    if keyword:
        query = query.filter(Tag.name.contains(keyword.strip()))
    if not include_inactive:
        query = query.filter(Tag.is_active.is_(True))
    return query.order_by(Tag.sort_order.asc(), Tag.name.asc()).all()


def get_tag(db: Session, tag_id: int) -> Optional[Tag]:
    return db.query(Tag).filter(Tag.id == tag_id).first()


def get_tags_by_ids(db: Session, tag_ids: List[int]) -> List[Tag]:
    if not tag_ids:
        return []
    return db.query(Tag).filter(Tag.id.in_(tag_ids)).all()


def create_tag(
    db: Session,
    *,
    name: str,
    sort_order: int = 0,
    is_active: bool = True,
) -> Tag:
    normalized_name = name.strip()
    exists = (
        db.query(Tag)
        .filter(func.lower(Tag.name) == normalized_name.lower())
        .first()
    )
    if exists:
        raise ValueError("Tag already exists")
    now = datetime.utcnow()
    tag = Tag(
        name=normalized_name,
        sort_order=sort_order,
        is_active=is_active,
        updated_at=now,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(
    db: Session,
    *,
    tag_id: int,
    name: Optional[str] = None,
    sort_order: Optional[int] = None,
    is_active: Optional[bool] = None,
) -> Optional[Tag]:
    tag = get_tag(db, tag_id)
    if not tag:
        return None
    if name is not None:
        normalized_name = name.strip()
        exists = (
            db.query(Tag)
            .filter(func.lower(Tag.name) == normalized_name.lower(), Tag.id != tag_id)
            .first()
        )
        if exists:
            raise ValueError("Tag already exists")
        tag.name = normalized_name
    if sort_order is not None:
        tag.sort_order = sort_order
    if is_active is not None:
        tag.is_active = is_active
    tag.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tag)
    return tag


def deactivate_tag(db: Session, *, tag_id: int) -> bool:
    tag = get_tag(db, tag_id)
    if not tag:
        return False
    tag.is_active = False
    db.commit()
    return True


def get_pins_admin(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    tag_id: Optional[int] = None,
    include_deleted: bool = False,
) -> List[Pin]:
    query = db.query(Pin).options(selectinload(Pin.tags))
    if not include_deleted:
        query = query.filter(Pin.is_deleted.is_(False))
    if keyword:
        query = query.filter(
            or_(
                Pin.title.contains(keyword.strip()),
                Pin.description.contains(keyword.strip()),
            )
        )
    if status:
        query = query.filter(Pin.status == status)
    if tag_id:
        query = query.join(Pin.tags).filter(Tag.id == tag_id)
    return (
        query.order_by(Pin.sort_order.asc(), Pin.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_pin(
    db: Session,
    *,
    title: str,
    image_url: str,
    description: Optional[str],
    status: str,
    sort_order: int,
    tag_ids: List[int],
) -> Pin:
    now = datetime.utcnow()
    pin = Pin(
        title=title.strip(),
        image_url=image_url,
        description=description,
        status=status,
        sort_order=sort_order,
        is_deleted=False,
        updated_at=now,
    )
    tags = get_tags_by_ids(db, tag_ids)
    pin.tags = tags
    db.add(pin)
    db.commit()
    db.refresh(pin)
    return pin


def update_pin(
    db: Session,
    *,
    pin_id: int,
    title: Optional[str] = None,
    image_url: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    sort_order: Optional[int] = None,
    tag_ids: Optional[List[int]] = None,
) -> Optional[Pin]:
    pin = get_pin_for_admin(db, pin_id=pin_id)
    if not pin:
        return None
    if title is not None:
        pin.title = title.strip()
    if image_url is not None:
        pin.image_url = image_url
    if description is not None:
        pin.description = description
    if status is not None:
        pin.status = status
    if sort_order is not None:
        pin.sort_order = sort_order
    if tag_ids is not None:
        pin.tags = get_tags_by_ids(db, tag_ids)
    pin.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pin)
    return pin


def get_pin_for_admin(db: Session, *, pin_id: int) -> Optional[Pin]:
    return (
        db.query(Pin)
        .options(selectinload(Pin.tags))
        .filter(Pin.id == pin_id)
        .first()
    )


def soft_delete_pin(db: Session, *, pin_id: int) -> bool:
    pin = get_pin_for_admin(db, pin_id=pin_id)
    if not pin:
        return False
    pin.is_deleted = True
    db.commit()
    return True
