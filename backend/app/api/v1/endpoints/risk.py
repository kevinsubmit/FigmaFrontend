"""
Risk control admin endpoints
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.models.risk import UserRiskState
from app.models.user import User
from app.services import risk_service

router = APIRouter()


class RiskUserItem(BaseModel):
    user_id: int
    username: str
    phone: str
    full_name: Optional[str] = None
    risk_level: str
    restricted_until: Optional[datetime] = None
    cancel_7d: int
    no_show_30d: int
    manual_note: Optional[str] = None


class RiskUserActionPayload(BaseModel):
    action: str
    risk_level: Optional[str] = None
    note: Optional[str] = None
    hours: Optional[int] = 24


@router.get("/users", response_model=List[RiskUserItem])
def list_risk_users(
    keyword: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    restricted_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    query = (
        db.query(User, UserRiskState)
        .outerjoin(UserRiskState, UserRiskState.user_id == User.id)
        .filter(User.is_active == True)
    )

    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.filter((User.username.ilike(kw)) | (User.phone.ilike(kw)) | (User.full_name.ilike(kw)))

    if risk_level:
        query = query.filter(UserRiskState.risk_level == risk_level)

    if restricted_only:
        query = query.filter(UserRiskState.restricted_until.isnot(None), UserRiskState.restricted_until > datetime.now())

    rows = query.order_by(User.id.desc()).offset(skip).limit(limit).all()

    result: List[RiskUserItem] = []
    for user, state in rows:
        if not state:
            state = risk_service.refresh_user_risk_state(db, user_id=user.id)
        result.append(
            RiskUserItem(
                user_id=user.id,
                username=user.username,
                phone=user.phone,
                full_name=user.full_name,
                risk_level=state.risk_level,
                restricted_until=state.restricted_until,
                cancel_7d=state.cancel_7d,
                no_show_30d=state.no_show_30d,
                manual_note=state.manual_note,
            )
        )
    return result


@router.patch("/users/{user_id}", response_model=RiskUserItem)
def handle_risk_user_action(
    user_id: int,
    payload: RiskUserActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    target_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    action = payload.action.strip().lower()
    if action == "restrict_24h":
        state = risk_service.restrict_user(
            db,
            user_id=user_id,
            admin_id=current_user.id,
            hours=payload.hours or 24,
            note=payload.note,
        )
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="manual_restriction",
            reason="restrict_24h",
            meta={"admin_id": current_user.id, "hours": payload.hours or 24},
        )
    elif action == "unrestrict":
        state = risk_service.unrestrict_user(
            db,
            user_id=user_id,
            admin_id=current_user.id,
            note=payload.note,
        )
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="manual_restriction",
            reason="unrestrict",
            meta={"admin_id": current_user.id},
        )
    elif action == "set_level":
        if not payload.risk_level:
            raise HTTPException(status_code=400, detail="risk_level is required for set_level action")
        try:
            state = risk_service.set_user_risk_level(
                db,
                user_id=user_id,
                admin_id=current_user.id,
                risk_level=payload.risk_level,
                note=payload.note,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="manual_risk_level_change",
            reason=payload.risk_level,
            meta={"admin_id": current_user.id},
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported action")

    return RiskUserItem(
        user_id=target_user.id,
        username=target_user.username,
        phone=target_user.phone,
        full_name=target_user.full_name,
        risk_level=state.risk_level,
        restricted_until=state.restricted_until,
        cancel_7d=state.cancel_7d,
        no_show_30d=state.no_show_30d,
        manual_note=state.manual_note,
    )
