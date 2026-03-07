"""
Centralized system log service.
"""
from __future__ import annotations

import json
import logging
import os
from queue import Empty, Full, Queue
from threading import Event, Lock, Thread
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.system_log import SystemLog

_ASYNC_LOG_QUEUE_SIZE = max(100, int(os.getenv("ASYNC_LOG_QUEUE_SIZE", "5000")))
_ASYNC_LOG_POLL_SECONDS = 0.2
logger = logging.getLogger(__name__)


class _AsyncSystemLogWriter:
    def __init__(self, maxsize: int):
        self._queue: Queue[dict[str, Any]] = Queue(maxsize=maxsize)
        self._stop_event = Event()
        self._lock = Lock()
        self._thread: Optional[Thread] = None

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._thread = Thread(
                target=self._run,
                name="system-log-writer",
                daemon=True,
            )
            self._thread.start()

    def stop(self, timeout_seconds: float = 2.0) -> None:
        with self._lock:
            thread = self._thread
            self._stop_event.set()
        if thread and thread.is_alive():
            thread.join(timeout=timeout_seconds)

    def enqueue(self, payload: dict[str, Any]) -> bool:
        self.start()
        try:
            self._queue.put_nowait(payload)
            return True
        except Full:
            logger.warning("Async system log queue is full; dropping log event")
            return False

    def _run(self) -> None:
        while not self._stop_event.is_set() or not self._queue.empty():
            try:
                payload = self._queue.get(timeout=_ASYNC_LOG_POLL_SECONDS)
            except Empty:
                continue

            db = SessionLocal()
            try:
                create_system_log(db, **payload)
            finally:
                db.close()
                self._queue.task_done()


_ASYNC_LOG_WRITER = _AsyncSystemLogWriter(maxsize=_ASYNC_LOG_QUEUE_SIZE)


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
        logger.warning(
            "Failed to persist system log (type=%s, level=%s, module=%s, action=%s)",
            log_type,
            level,
            module,
            action,
            exc_info=True,
        )
        return None


def create_system_log_async(
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
) -> bool:
    return _ASYNC_LOG_WRITER.enqueue(
        {
            "log_type": log_type,
            "level": level,
            "module": module,
            "action": action,
            "message": message,
            "operator_user_id": operator_user_id,
            "store_id": store_id,
            "target_type": target_type,
            "target_id": target_id,
            "request_id": request_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "path": path,
            "method": method,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "before": before,
            "after": after,
            "meta": meta,
        }
    )


def start_async_logger() -> None:
    _ASYNC_LOG_WRITER.start()


def shutdown_async_logger(timeout_seconds: float = 2.0) -> None:
    _ASYNC_LOG_WRITER.stop(timeout_seconds=timeout_seconds)


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
