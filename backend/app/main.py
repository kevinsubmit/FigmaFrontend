"""
FastAPI main application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.services.scheduler import reminder_scheduler
import hashlib
import logging
import os
from datetime import datetime
import ipaddress
import json
import re
import time
import uuid
from threading import Lock
from urllib.parse import parse_qsl, urlencode

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.security import SecurityBlockLog, SecurityIPRule
from app.models.user import User
from app.services import log_service, notification_service
from app.services.upload_file_service import build_upload_response

logger = logging.getLogger(__name__)
_SENSITIVE_QUERY_KEYS = {
    "refresh_token",
    "access_token",
    "id_token",
    "token",
    "authorization",
    "password",
    "passwd",
    "pwd",
    "secret",
    "api_key",
    "apikey",
    "verification_code",
    "code",
}
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
_CLIENT_PLATFORM_PATTERN = re.compile(r"^[a-z0-9._-]{1,32}$")
_SECURITY_RULE_CACHE_TTL_SECONDS = max(1.0, float(os.getenv("SECURITY_RULE_CACHE_TTL_SECONDS", "30")))
_SECURITY_RULE_CACHE_LOCK = Lock()
_SECURITY_RULE_CACHE: dict[str, dict[str, object]] = {}


def _resolve_access_log_sample_rate() -> float:
    raw_value = os.getenv("ACCESS_LOG_SAMPLE_RATE", "0.10")
    try:
        return max(0.0, min(1.0, float(raw_value)))
    except (TypeError, ValueError):
        return 0.10


_ACCESS_LOG_SAMPLE_RATE = _resolve_access_log_sample_rate()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting up application...")
    log_service.start_async_logger()
    notification_service.start_async_push_dispatcher()
    scheduler_started = False
    if settings.embedded_scheduler_enabled:
        reminder_scheduler.start()
        scheduler_started = True
        logger.info("Embedded reminder scheduler started")
    else:
        logger.info("Embedded reminder scheduler disabled for web process")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    if scheduler_started:
        await reminder_scheduler.stop()
    log_service.shutdown_async_logger(timeout_seconds=2.0)
    notification_service.shutdown_async_push_dispatcher(timeout_seconds=5.0)
    if scheduler_started:
        logger.info("Embedded reminder scheduler stopped")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="NailsDash美甲预约平台后端API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API router
app.include_router(api_router, prefix="/api/v1")


def _extract_client_ip(request) -> str:
    remote_ip = request.client.host if request.client else ""
    if not settings.TRUST_X_FORWARDED_FOR:
        return remote_ip

    if settings.trusted_proxy_ips_list and remote_ip not in settings.trusted_proxy_ips_list:
        return remote_ip

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return remote_ip

    client_ip = forwarded.split(",")[0].strip()
    return client_ip or remote_ip


def _extract_request_id(request) -> str:
    incoming = _normalize_header_value(request.headers.get("x-request-id"), max_length=128)
    if incoming and _REQUEST_ID_PATTERN.fullmatch(incoming):
        return incoming
    return uuid.uuid4().hex


def _normalize_header_value(raw_value: str | None, max_length: int) -> str:
    if not raw_value:
        return ""
    normalized = raw_value.replace("\r", "").replace("\n", "").replace("\t", "").strip()
    if len(normalized) > max_length:
        normalized = normalized[:max_length]
    return normalized


def _is_sensitive_query_key(key: str) -> bool:
    normalized = key.strip().lower()
    if not normalized:
        return False
    if normalized in _SENSITIVE_QUERY_KEYS:
        return True
    return normalized.endswith("_token") or "password" in normalized or "secret" in normalized


def _sanitize_query_string(raw_query: str | None) -> str:
    if not raw_query:
        return ""
    try:
        pairs = parse_qsl(raw_query, keep_blank_values=True)
    except Exception:
        return "<unparseable>"
    if not pairs:
        return ""

    sanitized_pairs = [
        (key, "[REDACTED]" if _is_sensitive_query_key(key) else value)
        for key, value in pairs
    ]
    return urlencode(sanitized_pairs, doseq=True)


def _extract_client_meta(request) -> dict[str, str]:
    platform = _normalize_header_value(request.headers.get("x-client-platform"), max_length=32).lower()
    version = _normalize_header_value(request.headers.get("x-client-version"), max_length=64)

    if platform and not _CLIENT_PLATFORM_PATTERN.fullmatch(platform):
        platform = ""

    meta: dict[str, str] = {}
    if platform:
        meta["client_platform"] = platform
    if version:
        meta["client_version"] = version
    return meta


def _resolve_operator_user_id(db, request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        token_user_id = payload.get("sub")
        token_phone = payload.get("phone")
        if token_user_id is not None:
            try:
                return int(token_user_id)
            except (TypeError, ValueError):
                if db is not None:
                    # 兼容历史 token: sub 可能是手机号或用户名
                    user_obj = (
                        db.query(User)
                        .filter((User.phone == str(token_user_id)) | (User.username == str(token_user_id)))
                        .first()
                    )
                    if user_obj:
                        return user_obj.id
        if token_phone:
            if db is not None:
                user_obj = db.query(User).filter(User.phone == str(token_phone)).first()
                if user_obj:
                    return user_obj.id
        return None
    except Exception:
        return None


def _resolve_operator_user_id_for_logging(request) -> int | None:
    operator_user_id = _resolve_operator_user_id(None, request)
    if operator_user_id is not None:
        return operator_user_id

    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None

    db = SessionLocal()
    try:
        return _resolve_operator_user_id(db, request)
    finally:
        db.close()


def _determine_scope(path: str) -> str | None:
    if path == "/api/v1/auth/login":
        return "admin_login"
    if path.startswith("/api/v1/"):
        return "admin_api"
    return None


def _extract_module(path: str) -> str:
    parts = [segment for segment in path.split("/") if segment]
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        return parts[2]
    if len(parts) >= 1:
        return parts[0]
    return "unknown"


def _should_sample_access_log(request_id: str) -> bool:
    if _ACCESS_LOG_SAMPLE_RATE >= 1.0:
        return True
    if _ACCESS_LOG_SAMPLE_RATE <= 0.0:
        return False

    digest = hashlib.md5(request_id.encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) / 0xFFFFFFFF
    return bucket < _ACCESS_LOG_SAMPLE_RATE


def _rule_matches_ip(target_type: str, target_value: str, ip_value: str) -> bool:
    try:
        client_ip = ipaddress.ip_address(ip_value)
        if target_type == "ip":
            return ipaddress.ip_address(target_value) == client_ip
        if target_type == "cidr":
            return client_ip in ipaddress.ip_network(target_value, strict=False)
    except ValueError:
        return False
    return False


def _load_active_security_rules(db, scope: str):
    now_ts = time.time()
    with _SECURITY_RULE_CACHE_LOCK:
        cache_entry = _SECURITY_RULE_CACHE.get(scope)
        if cache_entry and float(cache_entry.get("expires_at", 0)) > now_ts:
            return cache_entry.get("rules", [])

    rows = (
        db.query(SecurityIPRule)
        .filter(
            SecurityIPRule.status == "active",
            SecurityIPRule.scope.in_([scope, "all"]),
        )
        .all()
    )
    rules = [
        {
            "id": int(row.id),
            "target_type": str(row.target_type),
            "target_value": str(row.target_value),
            "rule_type": str(row.rule_type),
            "priority": int(row.priority),
            "expires_at": row.expires_at,
        }
        for row in rows
    ]

    with _SECURITY_RULE_CACHE_LOCK:
        _SECURITY_RULE_CACHE[scope] = {
            "expires_at": now_ts + _SECURITY_RULE_CACHE_TTL_SECONDS,
            "rules": rules,
        }
    return rules


@app.middleware("http")
async def security_ip_guard(request, call_next):
    scope = _determine_scope(request.url.path)
    if not scope:
        return await call_next(request)

    client_ip = _extract_client_ip(request)
    if not client_ip:
        return await call_next(request)

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        rules = _load_active_security_rules(db, scope)
        matched_rules = [
            rule
            for rule in rules
            if (rule["expires_at"] is None or rule["expires_at"] > now)
            and _rule_matches_ip(str(rule["target_type"]), str(rule["target_value"]), client_ip)
        ]

        if not matched_rules:
            return await call_next(request)

        allow_priorities = [int(rule["priority"]) for rule in matched_rules if rule["rule_type"] == "allow"]
        deny_rules = [rule for rule in matched_rules if rule["rule_type"] == "deny"]
        deny_priority = min((int(rule["priority"]) for rule in deny_rules), default=None)
        allow_priority = min(allow_priorities) if allow_priorities else None

        is_allowed = allow_priority is not None and (deny_priority is None or allow_priority <= deny_priority)
        if is_allowed:
            return await call_next(request)

        matched_rule = min(deny_rules, key=lambda item: int(item["priority"])) if deny_rules else None

        user_id = _resolve_operator_user_id(db, request)

        sanitized_query = _sanitize_query_string(request.url.query)
        client_meta = _extract_client_meta(request)
        security_meta = {"query": sanitized_query, **client_meta}
        db.add(
            SecurityBlockLog(
                ip_address=client_ip,
                path=request.url.path,
                method=request.method,
                scope=scope,
                matched_rule_id=int(matched_rule["id"]) if matched_rule else None,
                block_reason="ip_deny",
                user_id=user_id,
                user_agent=request.headers.get("user-agent"),
                meta_json=json.dumps(security_meta),
            )
        )
        db.commit()
        request_id = _extract_request_id(request)
        log_service.create_system_log_async(
            log_type="security",
            level="warn",
            module="security",
            action="security.ip_deny",
            message="请求被IP策略拦截",
            operator_user_id=user_id,
            target_type="security_ip_rule",
            target_id=str(matched_rule["id"]) if matched_rule else None,
            request_id=request_id,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
            path=request.url.path,
            method=request.method,
            status_code=403,
            meta={"scope": scope, **security_meta},
        )

        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied by security policy"},
            headers={"X-Request-Id": request_id},
        )
    finally:
        db.close()


@app.middleware("http")
async def access_log_middleware(request, call_next):
    start_time = time.perf_counter()
    request_id = _extract_request_id(request)
    path = request.url.path
    method = request.method
    client_ip = _extract_client_ip(request)
    module = _extract_module(path)
    sanitized_query = _sanitize_query_string(request.url.query)
    client_meta = _extract_client_meta(request)
    access_meta = {"query": sanitized_query, **client_meta}

    # response default values
    status_code = 500
    message = "internal_error"

    try:
        response = await call_next(request)
        status_code = response.status_code
        message = "success" if status_code < 400 else "request_failed"
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        operator_user_id = _resolve_operator_user_id_for_logging(request)
        log_service.create_system_log_async(
            log_type="error",
            level="critical",
            module=module,
            action="http.request",
            message=str(exc),
            operator_user_id=operator_user_id,
            request_id=request_id,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
            path=path,
            method=method,
            status_code=500,
            latency_ms=latency_ms,
            meta=access_meta,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-Id": request_id},
        )

    latency_ms = int((time.perf_counter() - start_time) * 1000)
    if status_code < 400:
        if _should_sample_access_log(request_id):
            log_service.create_system_log_async(
                log_type="access",
                level="info",
                module=module,
                action="http.request",
                message=message,
                operator_user_id=None,
                request_id=request_id,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent"),
                path=path,
                method=method,
                status_code=status_code,
                latency_ms=latency_ms,
                meta=access_meta,
            )
    else:
        operator_user_id = _resolve_operator_user_id_for_logging(request)
        log_type = "error" if status_code >= 500 else "access"
        level = "error" if status_code >= 500 else "warn"
        log_service.create_system_log_async(
            log_type=log_type,
            level=level,
            module=module,
            action="http.request",
            message=message,
            operator_user_id=operator_user_id,
            request_id=request_id,
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
            path=path,
            method=method,
            status_code=status_code,
            latency_ms=latency_ms,
            meta=access_meta,
        )

    response.headers.setdefault("X-Request-Id", request_id)
    return response


@app.middleware("http")
async def upload_response_security_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        if 300 <= response.status_code < 400:
            return response
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; img-src 'self' data: blob:; style-src 'none'; script-src 'none'",
        )

        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if not content_type.startswith("image/"):
            response.headers.setdefault("Content-Disposition", "attachment")
    return response


@app.api_route("/uploads/{file_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_upload(file_path: str):
    return build_upload_response(file_path)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to NailsDash API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
