"""
System logs admin endpoints.
"""
from datetime import datetime
import json
import re
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.models.system_log import SystemLog
from app.models.user import User

router = APIRouter()
ET_TZ = ZoneInfo("America/New_York")
UTC_TZ = ZoneInfo("UTC")


class SystemLogOut(BaseModel):
    id: int
    log_type: str
    level: str
    module: Optional[str] = None
    action: Optional[str] = None
    message: Optional[str] = None
    operator_user_id: Optional[int] = None
    operator_phone: Optional[str] = None
    store_id: Optional[int] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    request_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    before_json: Optional[str] = None
    after_json: Optional[str] = None
    meta_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SystemLogListOut(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[SystemLogOut]


class SystemLogDetailOut(SystemLogOut):
    before: Optional[Any] = None
    after: Optional[Any] = None
    meta: Optional[Any] = None


class SystemLogStatsOut(BaseModel):
    today_total: int
    today_error_count: int
    today_security_count: int
    avg_latency_ms: int
    p95_latency_ms: int
    top_modules: List[Dict[str, Any]]
    top_actions: List[Dict[str, Any]]
    top_error_paths: List[Dict[str, Any]]


def _parse_json_text(text: Optional[str]) -> Optional[Any]:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return text


def _build_operator_phone_map(db: Session, items: List[SystemLog]) -> Dict[int, str]:
    operator_ids = sorted({item.operator_user_id for item in items if item.operator_user_id is not None})
    if not operator_ids:
        return {}
    rows = db.query(User.id, User.phone).filter(User.id.in_(operator_ids)).all()
    return {int(row.id): str(row.phone) for row in rows if row.phone}


@router.get("/admin", response_model=SystemLogListOut)
def list_logs_admin(
    log_type: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    operator_user_id: Optional[int] = Query(None),
    operator_role: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    target_id: Optional[str] = Query(None),
    request_id: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    query = db.query(SystemLog)
    valid_operator_roles = {"super_admin", "store_admin", "normal_user"}
    if log_type and log_type != "all":
        query = query.filter(SystemLog.log_type == log_type)
    if level and level != "all":
        query = query.filter(SystemLog.level == level)
    if module and module != "all":
        query = query.filter(SystemLog.module == module)
    if action and action != "all":
        query = query.filter(SystemLog.action == action)
    if operator_user_id is not None:
        query = query.filter(SystemLog.operator_user_id == operator_user_id)
    if operator and operator.strip():
        operator_text = operator.strip()
        operator_ids: List[int] = []

        # 数字输入视为精确匹配手机号(按数字归一化)或用户ID，避免误匹配其他操作者。
        if operator_text.isdigit():
            normalized = operator_text
            user_rows = db.query(User.id, User.phone).all()
            for row in user_rows:
                phone_digits = re.sub(r"\D", "", str(row.phone or ""))
                if phone_digits == normalized:
                    operator_ids.append(int(row.id))
            operator_ids.extend(
                [int(row.id) for row in db.query(User.id).filter(User.id == int(operator_text)).all()]
            )
            operator_ids = sorted(set(operator_ids))
        else:
            operator_ids = [
                int(row.id)
                for row in db.query(User.id).filter(User.phone.ilike(f"%{operator_text}%")).all()
            ]

        if not operator_ids:
            query = query.filter(SystemLog.id == -1)
        else:
            query = query.filter(SystemLog.operator_user_id.in_(operator_ids))
    if operator_role and operator_role != "all":
        if operator_role not in valid_operator_roles:
            raise HTTPException(status_code=400, detail="Invalid operator_role")
        operator_ids_query = db.query(User.id)
        if operator_role == "super_admin":
            operator_ids_query = operator_ids_query.filter(User.is_admin.is_(True))
        elif operator_role == "store_admin":
            operator_ids_query = operator_ids_query.filter(User.is_admin.is_(False), User.store_id.isnot(None))
        else:
            operator_ids_query = operator_ids_query.filter(User.is_admin.is_(False), User.store_id.is_(None))
        query = query.filter(SystemLog.operator_user_id.in_(operator_ids_query))
    if target_type and target_type != "all":
        query = query.filter(SystemLog.target_type == target_type)
    if target_id:
        query = query.filter(SystemLog.target_id == target_id.strip())
    if request_id:
        query = query.filter(SystemLog.request_id == request_id.strip())
    if ip_address:
        query = query.filter(SystemLog.ip_address == ip_address.strip())
    if status_code is not None:
        query = query.filter(SystemLog.status_code == status_code)
    if date_from:
        query = query.filter(SystemLog.created_at >= date_from)
    if date_to:
        query = query.filter(SystemLog.created_at <= date_to)

    total = query.count()
    items = query.order_by(desc(SystemLog.created_at)).offset(skip).limit(limit).all()
    operator_phone_map = _build_operator_phone_map(db, items)
    response_items = [
        SystemLogOut(
            **item.__dict__,
            operator_phone=operator_phone_map.get(item.operator_user_id) if item.operator_user_id is not None else None,
        )
        for item in items
    ]
    return SystemLogListOut(total=total, skip=skip, limit=limit, items=response_items)


@router.get("/admin/stats", response_model=SystemLogStatsOut)
def get_log_stats_admin(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    now_utc = datetime.now(UTC_TZ)
    now_et = now_utc.astimezone(ET_TZ)
    day_start_et = now_et.replace(hour=0, minute=0, second=0, microsecond=0)
    # Database timestamps are stored as UTC-like naive datetimes in current project,
    # so compare using UTC naive boundaries.
    day_start = day_start_et.astimezone(UTC_TZ).replace(tzinfo=None)

    today_total = (
        db.query(func.count(SystemLog.id))
        .filter(SystemLog.created_at >= day_start)
        .scalar()
        or 0
    )
    today_error_count = (
        db.query(func.count(SystemLog.id))
        .filter(SystemLog.created_at >= day_start, SystemLog.level.in_(["error", "critical"]))
        .scalar()
        or 0
    )
    today_security_count = (
        db.query(func.count(SystemLog.id))
        .filter(SystemLog.created_at >= day_start, SystemLog.log_type == "security")
        .scalar()
        or 0
    )

    avg_latency = (
        db.query(func.avg(SystemLog.latency_ms))
        .filter(SystemLog.created_at >= day_start, SystemLog.latency_ms.isnot(None))
        .scalar()
    )
    avg_latency_ms = int(avg_latency or 0)

    # Approximate P95 by taking top 5% threshold position in descending-ordered latencies.
    latency_count = (
        db.query(func.count(SystemLog.id))
        .filter(SystemLog.created_at >= day_start, SystemLog.latency_ms.isnot(None))
        .scalar()
        or 0
    )
    p95_latency_ms = 0
    if latency_count > 0:
        skip_rows = max(0, int(latency_count * 0.05) - 1)
        p95_row = (
            db.query(SystemLog.latency_ms)
            .filter(SystemLog.created_at >= day_start, SystemLog.latency_ms.isnot(None))
            .order_by(desc(SystemLog.latency_ms))
            .offset(skip_rows)
            .limit(1)
            .first()
        )
        p95_latency_ms = int(p95_row[0]) if p95_row and p95_row[0] is not None else 0

    top_modules_rows = (
        db.query(SystemLog.module, func.count(SystemLog.id).label("count"))
        .filter(SystemLog.created_at >= day_start, SystemLog.module.isnot(None))
        .group_by(SystemLog.module)
        .order_by(desc("count"))
        .limit(8)
        .all()
    )
    top_actions_rows = (
        db.query(SystemLog.action, func.count(SystemLog.id).label("count"))
        .filter(SystemLog.created_at >= day_start, SystemLog.action.isnot(None))
        .group_by(SystemLog.action)
        .order_by(desc("count"))
        .limit(8)
        .all()
    )
    top_error_paths_rows = (
        db.query(SystemLog.path, func.count(SystemLog.id).label("count"))
        .filter(
            SystemLog.created_at >= day_start,
            SystemLog.path.isnot(None),
            SystemLog.level.in_(["error", "critical"]),
        )
        .group_by(SystemLog.path)
        .order_by(desc("count"))
        .limit(8)
        .all()
    )

    return SystemLogStatsOut(
        today_total=int(today_total),
        today_error_count=int(today_error_count),
        today_security_count=int(today_security_count),
        avg_latency_ms=avg_latency_ms,
        p95_latency_ms=p95_latency_ms,
        top_modules=[{"module": row.module, "count": int(row.count)} for row in top_modules_rows],
        top_actions=[{"action": row.action, "count": int(row.count)} for row in top_actions_rows],
        top_error_paths=[{"path": row.path, "count": int(row.count)} for row in top_error_paths_rows],
    )


@router.get("/admin/{log_id}", response_model=SystemLogDetailOut)
def get_log_admin(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    item = db.query(SystemLog).filter(SystemLog.id == log_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Log not found")
    operator_phone = None
    if item.operator_user_id is not None:
        user = db.query(User.id, User.phone).filter(User.id == item.operator_user_id).first()
        operator_phone = str(user.phone) if user and user.phone else None
    return SystemLogDetailOut(
        **item.__dict__,
        operator_phone=operator_phone,
        before=_parse_json_text(item.before_json),
        after=_parse_json_text(item.after_json),
        meta=_parse_json_text(item.meta_json),
    )
