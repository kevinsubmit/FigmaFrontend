"""
Pins (inspiration) endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db
from app.crud import pin as crud_pin
from app.schemas.pin import PinResponse

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
