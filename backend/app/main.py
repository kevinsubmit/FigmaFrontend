"""
FastAPI main application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.services.scheduler import reminder_scheduler
import logging
from pathlib import Path
from datetime import datetime
import ipaddress
import json

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.security import SecurityBlockLog, SecurityIPRule
from app.models.user import User

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting up application...")
    reminder_scheduler.start()
    logger.info("Reminder scheduler started")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    await reminder_scheduler.stop()
    logger.info("Reminder scheduler stopped")


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API router
app.include_router(api_router, prefix="/api/v1")


def _extract_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _determine_scope(path: str) -> str | None:
    if path == "/api/v1/auth/login":
        return "admin_login"
    if path.startswith("/api/v1/"):
        return "admin_api"
    return None


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
        rules = (
            db.query(SecurityIPRule)
            .filter(
                SecurityIPRule.status == "active",
                SecurityIPRule.scope.in_([scope, "all"]),
            )
            .all()
        )
        matched_rules = [
            rule
            for rule in rules
            if (rule.expires_at is None or rule.expires_at > now)
            and _rule_matches_ip(rule.target_type, rule.target_value, client_ip)
        ]

        if not matched_rules:
            return await call_next(request)

        allow_priorities = [rule.priority for rule in matched_rules if rule.rule_type == "allow"]
        deny_rules = [rule for rule in matched_rules if rule.rule_type == "deny"]
        deny_priority = min((rule.priority for rule in deny_rules), default=None)
        allow_priority = min(allow_priorities) if allow_priorities else None

        is_allowed = allow_priority is not None and (deny_priority is None or allow_priority <= deny_priority)
        if is_allowed:
            return await call_next(request)

        matched_rule = min(deny_rules, key=lambda item: item.priority) if deny_rules else None

        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = decode_token(token)
                token_user_id = payload.get("sub")
                if token_user_id:
                    user_obj = db.query(User).filter(User.id == int(token_user_id)).first()
                    user_id = user_obj.id if user_obj else None
            except Exception:
                user_id = None

        db.add(
            SecurityBlockLog(
                ip_address=client_ip,
                path=request.url.path,
                method=request.method,
                scope=scope,
                matched_rule_id=matched_rule.id if matched_rule else None,
                block_reason="ip_deny",
                user_id=user_id,
                user_agent=request.headers.get("user-agent"),
                meta_json=json.dumps({"query": str(request.url.query or "")}),
            )
        )
        db.commit()

        return JSONResponse(status_code=403, content={"detail": "Access denied by security policy"})
    finally:
        db.close()


@app.middleware("http")
async def upload_response_security_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
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

# Mount static files directory for uploads
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


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
