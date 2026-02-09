"""
Security admin endpoints
"""
from datetime import datetime, timedelta
import ipaddress
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.models.security import SecurityBlockLog, SecurityIPRule
from app.models.user import User
from app.services import log_service

router = APIRouter()


class SecurityRuleIn(BaseModel):
    rule_type: str = Field(pattern="^(allow|deny)$")
    target_type: str = Field(pattern="^(ip|cidr)$")
    target_value: str
    scope: str = Field(default="admin_api", pattern="^(admin_api|admin_login|all)$")
    status: str = Field(default="active", pattern="^(active|inactive)$")
    priority: int = 100
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None


class SecurityRuleOut(SecurityRuleIn):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SecurityBlockLogOut(BaseModel):
    id: int
    ip_address: str
    path: str
    method: str
    scope: str
    matched_rule_id: Optional[int] = None
    block_reason: str
    user_id: Optional[int] = None
    user_agent: Optional[str] = None
    meta_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SecuritySummary(BaseModel):
    today_block_count: int
    last_24h_block_count: int
    active_deny_rule_count: int
    active_allow_rule_count: int
    top_blocked_ips: List[dict]
    top_blocked_paths: List[dict]


class QuickBlockPayload(BaseModel):
    target_type: str = Field(pattern="^(ip|cidr)$")
    target_value: str
    scope: str = Field(default="admin_api", pattern="^(admin_api|admin_login|all)$")
    duration_hours: Optional[int] = Field(default=24, ge=1, le=24 * 365)
    reason: Optional[str] = "Quick block by admin"


class SecurityBlockLogListOut(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[SecurityBlockLogOut]


def _validate_target(target_type: str, target_value: str) -> str:
    value = target_value.strip()
    try:
        if target_type == "ip":
            ipaddress.ip_address(value)
        else:
            ipaddress.ip_network(value, strict=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {target_type} value") from exc
    return value


def _create_or_update_rule(
    db: Session,
    payload: SecurityRuleIn,
    admin_id: int,
    rule: Optional[SecurityIPRule] = None,
) -> SecurityIPRule:
    target_value = _validate_target(payload.target_type, payload.target_value)
    if rule is None:
        rule = SecurityIPRule(created_by=admin_id)
        db.add(rule)

    rule.rule_type = payload.rule_type
    rule.target_type = payload.target_type
    rule.target_value = target_value
    rule.scope = payload.scope
    rule.status = payload.status
    rule.priority = payload.priority
    rule.reason = payload.reason
    rule.expires_at = payload.expires_at

    db.commit()
    db.refresh(rule)
    return rule


def _extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _target_matches_ip(target_type: str, target_value: str, ip_value: str) -> bool:
    try:
        client_ip = ipaddress.ip_address(ip_value)
        if target_type == "ip":
            return ipaddress.ip_address(target_value) == client_ip
        return client_ip in ipaddress.ip_network(target_value, strict=False)
    except ValueError:
        return False


def _guard_self_lockout(payload: SecurityRuleIn, request: Request) -> None:
    if payload.rule_type != "deny":
        return
    client_ip = _extract_client_ip(request)
    if not client_ip:
        return
    normalized_target = _validate_target(payload.target_type, payload.target_value)
    if _target_matches_ip(payload.target_type, normalized_target, client_ip):
        raise HTTPException(
            status_code=400,
            detail="Cannot deny current request IP. Add an allow rule first if needed.",
        )


@router.get("/ip-rules", response_model=List[SecurityRuleOut])
def list_ip_rules(
    status: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    query = db.query(SecurityIPRule)
    if status and status != "all":
        query = query.filter(SecurityIPRule.status == status)
    if scope and scope != "all":
        query = query.filter(SecurityIPRule.scope == scope)
    if keyword:
        kw = f"%{keyword.strip()}%"
        query = query.filter(
            SecurityIPRule.target_value.ilike(kw) | SecurityIPRule.reason.ilike(kw)
        )
    return (
        query.order_by(SecurityIPRule.priority.asc(), SecurityIPRule.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/ip-rules", response_model=SecurityRuleOut, status_code=201)
def create_ip_rule(
    payload: SecurityRuleIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    _guard_self_lockout(payload, request)
    rule = _create_or_update_rule(db, payload, admin_id=current_user.id)
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="security",
        action="security.rule.create",
        message="创建IP访问规则",
        target_type="security_ip_rule",
        target_id=str(rule.id),
        after={
            "rule_type": rule.rule_type,
            "target_type": rule.target_type,
            "target_value": rule.target_value,
            "scope": rule.scope,
            "status": rule.status,
            "priority": rule.priority,
        },
    )
    return rule


@router.patch("/ip-rules/{rule_id}", response_model=SecurityRuleOut)
def update_ip_rule(
    rule_id: int,
    payload: SecurityRuleIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    rule = db.query(SecurityIPRule).filter(SecurityIPRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    before = {
        "rule_type": rule.rule_type,
        "target_type": rule.target_type,
        "target_value": rule.target_value,
        "scope": rule.scope,
        "status": rule.status,
        "priority": rule.priority,
    }
    _guard_self_lockout(payload, request)
    updated_rule = _create_or_update_rule(db, payload, admin_id=current_user.id, rule=rule)
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="security",
        action="security.rule.update",
        message="更新IP访问规则",
        target_type="security_ip_rule",
        target_id=str(updated_rule.id),
        before=before,
        after={
            "rule_type": updated_rule.rule_type,
            "target_type": updated_rule.target_type,
            "target_value": updated_rule.target_value,
            "scope": updated_rule.scope,
            "status": updated_rule.status,
            "priority": updated_rule.priority,
        },
    )
    return updated_rule


@router.get("/block-logs", response_model=SecurityBlockLogListOut)
def list_block_logs(
    ip_address: Optional[str] = Query(None),
    block_reason: Optional[str] = Query(None),
    path_keyword: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    query = db.query(SecurityBlockLog)
    if ip_address:
        query = query.filter(SecurityBlockLog.ip_address == ip_address.strip())
    if block_reason and block_reason != "all":
        query = query.filter(SecurityBlockLog.block_reason == block_reason)
    if scope and scope != "all":
        query = query.filter(SecurityBlockLog.scope == scope)
    if path_keyword:
        query = query.filter(SecurityBlockLog.path.ilike(f"%{path_keyword.strip()}%"))
    total = query.count()
    items = query.order_by(desc(SecurityBlockLog.created_at)).offset(skip).limit(limit).all()
    return SecurityBlockLogListOut(total=total, skip=skip, limit=limit, items=items)


@router.get("/summary", response_model=SecuritySummary)
def get_security_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    now = datetime.utcnow()
    day_start = datetime(now.year, now.month, now.day)
    last_24h = now - timedelta(hours=24)

    today_block_count = (
        db.query(func.count(SecurityBlockLog.id))
        .filter(SecurityBlockLog.created_at >= day_start)
        .scalar()
        or 0
    )
    last_24h_block_count = (
        db.query(func.count(SecurityBlockLog.id))
        .filter(SecurityBlockLog.created_at >= last_24h)
        .scalar()
        or 0
    )
    active_deny_rule_count = (
        db.query(func.count(SecurityIPRule.id))
        .filter(SecurityIPRule.status == "active", SecurityIPRule.rule_type == "deny")
        .scalar()
        or 0
    )
    active_allow_rule_count = (
        db.query(func.count(SecurityIPRule.id))
        .filter(SecurityIPRule.status == "active", SecurityIPRule.rule_type == "allow")
        .scalar()
        or 0
    )

    top_blocked_ips_rows = (
        db.query(SecurityBlockLog.ip_address, func.count(SecurityBlockLog.id).label("count"))
        .group_by(SecurityBlockLog.ip_address)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    top_blocked_paths_rows = (
        db.query(SecurityBlockLog.path, func.count(SecurityBlockLog.id).label("count"))
        .group_by(SecurityBlockLog.path)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )

    return SecuritySummary(
        today_block_count=int(today_block_count),
        last_24h_block_count=int(last_24h_block_count),
        active_deny_rule_count=int(active_deny_rule_count),
        active_allow_rule_count=int(active_allow_rule_count),
        top_blocked_ips=[{"ip": row.ip_address, "count": int(row.count)} for row in top_blocked_ips_rows],
        top_blocked_paths=[{"path": row.path, "count": int(row.count)} for row in top_blocked_paths_rows],
    )


@router.post("/quick-block", response_model=SecurityRuleOut, status_code=201)
def quick_block(
    payload: QuickBlockPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    expires_at = datetime.utcnow() + timedelta(hours=payload.duration_hours) if payload.duration_hours else None
    rule_payload = SecurityRuleIn(
        rule_type="deny",
        target_type=payload.target_type,
        target_value=payload.target_value,
        scope=payload.scope,
        status="active",
        priority=10,
        reason=payload.reason,
        expires_at=expires_at,
    )
    _guard_self_lockout(rule_payload, request)
    rule = _create_or_update_rule(db, rule_payload, admin_id=current_user.id)
    log_service.create_audit_log(
        db,
        request=request,
        operator_user_id=current_user.id,
        module="security",
        action="security.quick_block",
        message="快速封禁IP/CIDR",
        target_type="security_ip_rule",
        target_id=str(rule.id),
        after={
            "target_type": rule.target_type,
            "target_value": rule.target_value,
            "scope": rule.scope,
            "expires_at": str(rule.expires_at) if rule.expires_at else None,
        },
    )
    return rule
