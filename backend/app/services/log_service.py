"""
Centralized system log service.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.system_log import SystemLog


def _to_json_text(payload: Optional[Any]) -> Optional[str]:
    if payload is None:
        return None
    try:
        return json.dumps(payload, ensure_ascii=False, default=str)
    except Exception:
        return str(payload)


def create_system_log(
    db: Session,
    *,
    log_type: str,
    level: str,
    module: Optional[str] = None,
    action: Optional[str] = None,
    message: Optional[str] = None,
    operator_user_id: Optional[int] = None,
    store_id: Optional[int] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    path: Optional[str] = None,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    latency_ms: Optional[int] = None,
    before: Optional[Any] = None,
    after: Optional[Any] = None,
    meta: Optional[Any] = None,
) -> Optional[SystemLog]:
    try:
        item = SystemLog(
            log_type=log_type,
            level=level,
            module=module,
            action=action,
            message=message,
            operator_user_id=operator_user_id,
            store_id=store_id,
            target_type=target_type,
            target_id=target_id,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            path=path,
            method=method,
            status_code=status_code,
            latency_ms=latency_ms,
            before_json=_to_json_text(before),
            after_json=_to_json_text(after),
            meta_json=_to_json_text(meta),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        return None


def create_audit_log(
    db: Session,
    *,
    request: Optional[Request],
    operator_user_id: Optional[int],
    module: str,
    action: str,
    message: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    store_id: Optional[int] = None,
    before: Optional[Any] = None,
    after: Optional[Any] = None,
    meta: Optional[Any] = None,
) -> Optional[SystemLog]:
    request_id = request.headers.get("x-request-id") if request else None
    ip_address = None
    user_agent = None
    path = None
    method = None
    if request:
        forwarded = request.headers.get("x-forwarded-for")
        ip_address = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
        user_agent = request.headers.get("user-agent")
        path = request.url.path
        method = request.method

    return create_system_log(
        db,
        log_type="audit",
        level="info",
        module=module,
        action=action,
        message=message,
        operator_user_id=operator_user_id,
        store_id=store_id,
        target_type=target_type,
        target_id=target_id,
        request_id=request_id,
        ip_address=ip_address,
        user_agent=user_agent,
        path=path,
        method=method,
        before=before,
        after=after,
        meta=meta,
    )
