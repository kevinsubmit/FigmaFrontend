"""
Risk control admin endpoints
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.models.risk import UserRiskState
from app.models.user import User
from app.services import log_service
from app.services import risk_service
from app.utils.phone_privacy import mask_phone, validate_keyword_min_length

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
    is_active: bool = True
    account_status: str = "active"


class RiskUserActionPayload(BaseModel):
    action: str
    risk_level: Optional[str] = None
    note: Optional[str] = None
    hours: Optional[int] = 24


@router.get("/users", response_model=List[RiskUserItem])
def list_risk_users(
    request: Request,
    keyword: Optional[str] = Query(None),
    include_full_phone: bool = Query(False, description="Only super admin can request full phone"),
    risk_level: Optional[str] = Query(None),
    restricted_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    if include_full_phone and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only super admin can access full phone numbers")
    try:
        validate_keyword_min_length(keyword, min_length=3)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    query = (
        db.query(User, UserRiskState)
        .outerjoin(UserRiskState, UserRiskState.user_id == User.id)
        .filter(User.is_admin == False)
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
                phone=user.phone if include_full_phone else mask_phone(user.phone),
                full_name=user.full_name,
                risk_level=state.risk_level,
                restricted_until=state.restricted_until,
                cancel_7d=state.cancel_7d,
                no_show_30d=state.no_show_30d,
                manual_note=state.manual_note,
                is_active=bool(user.is_active),
                account_status="active" if bool(user.is_active) else "permanently_banned",
            )
        )
    if include_full_phone:
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="risk",
            action="risk.users.full_phone",
            message="管理员查询风控列表明文手机号",
            target_type="user",
            meta={"count": len(result)},
        )
    return result


@router.patch("/users/{user_id}", response_model=RiskUserItem)
def handle_risk_user_action(
    request: Request,
    user_id: int,
    payload: RiskUserActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    target_user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
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
    elif action == "ban_permanent":
        if target_user.is_admin:
            raise HTTPException(status_code=400, detail="Cannot ban super admin account")
        target_user.is_active = False
        db.add(target_user)
        db.commit()
        db.refresh(target_user)
        state = risk_service.set_user_risk_level(
            db,
            user_id=user_id,
            admin_id=current_user.id,
            risk_level="high",
            note=payload.note or "permanent_ban",
        )
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="risk",
            action="risk.user.permanent_ban",
            message="超级管理员永久封禁账号",
            target_type="user",
            target_id=str(user_id),
            after={"is_active": False, "note": payload.note},
        )
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="manual_restriction",
            reason="ban_permanent",
            meta={"admin_id": current_user.id, "note": payload.note},
        )
    elif action == "unban_permanent":
        target_user.is_active = True
        db.add(target_user)
        db.commit()
        db.refresh(target_user)
        state = risk_service.unrestrict_user(
            db,
            user_id=user_id,
            admin_id=current_user.id,
            note=payload.note or "unban_permanent",
        )
        log_service.create_audit_log(
            db,
            request=request,
            operator_user_id=current_user.id,
            module="risk",
            action="risk.user.permanent_unban",
            message="超级管理员解除永久封禁",
            target_type="user",
            target_id=str(user_id),
            after={"is_active": True, "note": payload.note},
        )
        risk_service.log_risk_event(
            db,
            user_id=user_id,
            event_type="manual_restriction",
            reason="unban_permanent",
            meta={"admin_id": current_user.id, "note": payload.note},
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported action")

    return RiskUserItem(
        user_id=target_user.id,
        username=target_user.username,
        phone=mask_phone(target_user.phone),
        full_name=target_user.full_name,
        risk_level=state.risk_level,
        restricted_until=state.restricted_until,
        cancel_7d=state.cancel_7d,
        no_show_30d=state.no_show_30d,
        manual_note=state.manual_note,
        is_active=bool(target_user.is_active),
        account_status="active" if bool(target_user.is_active) else "permanently_banned",
    )
