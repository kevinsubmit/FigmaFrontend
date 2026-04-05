"""
End-to-end regression script for upload + notification flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service
3. Customer register/login
4. Avatar upload + current user avatar persistence + public file fetch
5. Multi-image upload + public file fetch
6. Customer creates appointment -> store admin gets notification
7. Store admin lists/gets notification and mark-all-read
8. Store admin confirms appointment -> customer gets notification
9. Customer lists/gets notification and marks it read
10. Cleanup uploaded files and dynamic regression data

Usage:
  cd backend
  python test_upload_notification_regression.py

Optional env vars:
  BASE_URL=http://localhost:8000/api/v1
  CLEANUP_BEFORE=1
  CLEANUP_AFTER=1
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User
from app.services.upload_file_service import ensure_upload_root


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
PUBLIC_BASE_URL = BASE_URL.rsplit("/api/v1", 1)[0] if BASE_URL.endswith("/api/v1") else BASE_URL
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550198")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "upload_notify_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663606")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "UploadPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "upload_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Upload Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Upload Notification Service")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "65"))

TEST_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
    b"\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x7f\x8d\x0b\x00\x04\xb7\x01\xe0"
    b"\xac\x1d\xf8Q"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)

TRUNCATE_TABLES: Sequence[str] = (
    "appointment_reminders",
    "appointment_service_items",
    "appointment_settlement_events",
    "appointment_staff_splits",
    "appointments",
    "backend_users",
    "coupon_phone_grants",
    "coupons",
    "daily_checkins",
    "gift_card_transactions",
    "gift_cards",
    "notifications",
    "pin_favorites",
    "point_transactions",
    "promotion_services",
    "promotions",
    "push_device_tokens",
    "referrals",
    "review_replies",
    "reviews",
    "risk_events",
    "security_block_logs",
    "services",
    "store_admin_applications",
    "store_blocked_slots",
    "store_favorites",
    "store_hours",
    "store_images",
    "store_portfolio",
    "stores",
    "system_logs",
    "technician_unavailable",
    "technicians",
    "user_coupons",
    "user_points",
    "user_risk_states",
    "verification_codes",
)


@dataclass
class SeedResult:
    admin_user_id: int
    store_id: int
    service_id: int


@dataclass
class HttpResponse:
    status: int
    body: bytes
    headers: Mapping[str, str]


def log(message: str) -> None:
    print(message, flush=True)


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def get_header(headers: Mapping[str, str], name: str) -> str:
    target = name.lower()
    for key, value in headers.items():
        if key.lower() == target:
            return value
    return ""


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return f"1{digits}"
    return digits


def request(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
    body: Optional[bytes] = None,
    headers: Optional[Mapping[str, str]] = None,
    timeout: int = 30,
) -> HttpResponse:
    merged_headers = dict(headers or {})
    if token:
        merged_headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url=f"{BASE_URL}{path}",
        data=body,
        headers=merged_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.getcode()
            raw = response.read()
            response_headers = dict(response.info())
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read() if exc.fp else b""
        response_headers = dict(exc.headers.items()) if exc.headers else {}
    except urllib.error.URLError as exc:
        raise RuntimeError(f"{method} {path} failed to connect: {exc}") from exc

    if status not in expected_statuses:
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            payload = {"raw": raw.decode("utf-8", errors="replace")}
        raise RuntimeError(f"{method} {path} failed: status={status}, body={payload}")

    return HttpResponse(status=status, body=raw, headers=response_headers)


def request_json(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
    **kwargs: Any,
) -> Dict[str, Any] | List[Any]:
    headers = dict(kwargs.pop("headers", {}) or {})
    data = kwargs.pop("json", None)
    body = kwargs.pop("body", None)
    if kwargs:
        raise TypeError(f"Unsupported request_json kwargs: {sorted(kwargs.keys())}")
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    response = request(
        method,
        path,
        token=token,
        expected_statuses=expected_statuses,
        body=body,
        headers=headers,
    )
    raw = response.body.decode("utf-8") if response.body else ""
    return json.loads(raw) if raw else {}


def request_public_file(path: str, *, expected_statuses: Tuple[int, ...] = (200,)) -> HttpResponse:
    req = urllib.request.Request(url=f"{PUBLIC_BASE_URL}{path}", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            raw = response.read()
            response_headers = dict(response.info())
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read() if exc.fp else b""
        response_headers = dict(exc.headers.items()) if exc.headers else {}
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GET {path} failed to connect: {exc}") from exc
    if status not in expected_statuses:
        raise RuntimeError(f"GET {path} failed: status={status}, body={raw[:200]!r}")
    return HttpResponse(status=status, body=raw, headers=response_headers)


def build_multipart_body(
    *,
    fields: Optional[Mapping[str, str]] = None,
    files: Sequence[Tuple[str, str, str, bytes]],
) -> Tuple[bytes, str]:
    boundary = f"----CodexSmoke{uuid.uuid4().hex}"
    chunks: List[bytes] = []
    for name, value in (fields or {}).items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    for field_name, filename, content_type, content in files:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                (
                    f'Content-Disposition: form-data; name="{field_name}"; '
                    f'filename="{filename}"\r\n'
                ).encode("utf-8"),
                f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                content,
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def upload_multipart_json(
    path: str,
    *,
    token: str,
    files: Sequence[Tuple[str, str, str, bytes]],
    fields: Optional[Mapping[str, str]] = None,
    expected_statuses: Tuple[int, ...] = (200,),
) -> Dict[str, Any] | List[Any]:
    body, content_type = build_multipart_body(fields=fields, files=files)
    return request_json(
        "POST",
        path,
        token=token,
        expected_statuses=expected_statuses,
        body=body,
        headers={"Content-Type": content_type},
    )


def cleanup_dynamic_data() -> None:
    log("[STEP] Cleanup dynamic regression data")
    db: Session = SessionLocal()
    try:
        db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table_name in TRUNCATE_TABLES:
            db.execute(text(f"TRUNCATE TABLE {table_name}"))
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.commit()
    finally:
        db.close()


def cleanup_uploaded_files(uploaded_urls: Sequence[str]) -> None:
    if not uploaded_urls:
        return
    upload_root = ensure_upload_root()
    for url in uploaded_urls:
        normalized = (url or "").strip()
        if not normalized.startswith("/uploads/"):
            continue
        relative_path = normalized[len("/uploads/") :]
        if not relative_path:
            continue
        file_path = (upload_root / relative_path).resolve()
        try:
            file_path.relative_to(upload_root)
        except ValueError:
            continue
        if file_path.is_file():
            file_path.unlink()
        parent = file_path.parent
        while parent != upload_root and parent.exists():
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent


def seed_minimal_data() -> SeedResult:
    log("[STEP] Seed minimal admin/store/service")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="789 Upload Ave",
            city="New York",
            state="NY",
            zip_code="10003",
            phone=normalize_phone(ADMIN_PHONE),
            email="upload@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression upload and notification test store",
        )
        db.add(store)
        db.flush()

        for day in range(7):
            db.add(
                StoreHours(
                    store_id=store.id,
                    day_of_week=day,
                    open_time=time(9, 0),
                    close_time=time(19, 0),
                    is_closed=False,
                )
            )

        service = Service(
            store_id=store.id,
            name=SERVICE_NAME,
            description="Regression upload and notification test service",
            price=SERVICE_PRICE,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=60,
            category="Nails",
            is_active=1,
        )
        db.add(service)
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Upload Admin",
            email="upload-admin@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=True,
            store_id=store.id,
            store_admin_status="approved",
        )
        db.add(admin)
        db.commit()
        db.refresh(store)
        db.refresh(service)
        db.refresh(admin)
        return SeedResult(
            admin_user_id=int(admin.id),
            store_id=int(store.id),
            service_id=int(service.id),
        )
    finally:
        db.close()


def register_customer() -> Dict[str, Any]:
    log("[STEP] Customer register")
    request_json(
        "POST",
        "/auth/send-verification-code",
        expected_statuses=(200,),
        json={"phone": CUSTOMER_PHONE, "purpose": "register"},
    )
    verify = request_json(
        "POST",
        "/auth/verify-code",
        expected_statuses=(200,),
        json={"phone": CUSTOMER_PHONE, "code": "123456", "purpose": "register"},
    )
    assert_equal(verify["valid"], True, "verification valid")
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": CUSTOMER_PHONE,
            "username": CUSTOMER_USERNAME,
            "full_name": "Upload Customer",
            "email": "upload-customer@example.com",
            "password": CUSTOMER_PASSWORD,
            "verification_code": "123456",
        },
    )


def login(phone: str, password: str, portal: str) -> str:
    payload = request_json(
        "POST",
        "/auth/login",
        expected_statuses=(200,),
        json={"phone": phone, "password": password, "login_portal": portal},
    )
    token = payload.get("access_token")
    if not token:
        raise RuntimeError(f"login missing access_token for phone={phone}")
    return str(token)


def run_api_flow(seed: SeedResult, uploaded_urls: List[str]) -> Dict[str, Any]:
    customer_user = register_customer()
    customer_user_id = int(customer_user["id"])

    log("[STEP] Admin and customer login")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    log("[STEP] Upload avatar and verify public access")
    avatar_payload = upload_multipart_json(
        "/auth/me/avatar",
        token=customer_token,
        files=[("file", "avatar.png", "image/png", TEST_PNG_BYTES)],
        expected_statuses=(200,),
    )
    avatar_url = str(avatar_payload["avatar_url"])
    uploaded_urls.append(avatar_url)
    assert_true(avatar_url.startswith("/uploads/avatars/"), "avatar url prefix mismatch")

    me = request_json("GET", "/auth/me", token=customer_token, expected_statuses=(200,))
    assert_equal(me["avatar_url"], avatar_url, "avatar persisted on /auth/me")

    avatar_response = request_public_file(avatar_url)
    assert_true(len(avatar_response.body) > 0, "avatar bytes empty")
    assert_true(
        get_header(avatar_response.headers, "Content-Type").startswith("image/"),
        "avatar content type mismatch",
    )
    assert_true(
        bool(get_header(avatar_response.headers, "Cache-Control")),
        "avatar missing cache control header",
    )

    log("[STEP] Upload gallery images and verify public access")
    image_urls = upload_multipart_json(
        "/upload/images",
        token=customer_token,
        files=[
            ("files", "sample-one.png", "image/png", TEST_PNG_BYTES),
            ("files", "sample-two.png", "image/png", TEST_PNG_BYTES),
        ],
        expected_statuses=(200,),
    )
    assert_equal(len(image_urls), 2, "uploaded image count")
    for image_url in image_urls:
        image_url = str(image_url)
        uploaded_urls.append(image_url)
        assert_true(image_url.startswith("/uploads/"), "image url prefix mismatch")
        image_response = request_public_file(image_url)
        assert_true(len(image_response.body) > 0, f"image bytes empty: {image_url}")
        assert_true(
            get_header(image_response.headers, "Content-Type").startswith("image/"),
            f"image content type mismatch: {image_url}",
        )

    log("[STEP] Create appointment and verify admin notification")
    appointment_date = (date.today() + timedelta(days=1)).isoformat()
    appointment = request_json(
        "POST",
        "/appointments/",
        token=customer_token,
        expected_statuses=(200, 201),
        json={
            "store_id": seed.store_id,
            "service_id": seed.service_id,
            "appointment_date": appointment_date,
            "appointment_time": "11:00:00",
            "notes": "upload notification regression flow",
        },
    )
    appointment_id = int(appointment["id"])

    admin_unread = request_json(
        "GET",
        "/notifications/unread-count",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(admin_unread["unread_count"], 1, "admin unread after appointment create")
    admin_notifications = request_json(
        "GET",
        "/notifications/?skip=0&limit=10&unread_only=true",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(len(admin_notifications), 1, "admin unread notification list size")
    admin_notification = admin_notifications[0]
    assert_equal(admin_notification["appointment_id"], appointment_id, "admin notification appointment id")
    assert_equal(admin_notification["title"], "New Appointment", "admin notification title")
    admin_notification_id = int(admin_notification["id"])
    admin_detail = request_json(
        "GET",
        f"/notifications/{admin_notification_id}",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(admin_detail["id"], admin_notification_id, "admin notification detail id")
    mark_all = request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(mark_all["marked_count"], 1, "admin mark-all-read count")
    admin_unread_after = request_json(
        "GET",
        "/notifications/unread-count",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(admin_unread_after["unread_count"], 0, "admin unread after mark-all-read")

    log("[STEP] Confirm appointment and verify customer notification")
    confirmed = request_json(
        "PATCH",
        f"/appointments/{appointment_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed["status"], "confirmed", "appointment confirmed status")

    customer_unread = request_json(
        "GET",
        "/notifications/unread-count",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(customer_unread["unread_count"], 1, "customer unread after confirm")
    customer_notifications = request_json(
        "GET",
        "/notifications/?skip=0&limit=10&unread_only=true",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(len(customer_notifications), 1, "customer unread notification list size")
    customer_notification = customer_notifications[0]
    assert_equal(
        customer_notification["appointment_id"],
        appointment_id,
        "customer notification appointment id",
    )
    assert_equal(
        customer_notification["title"],
        "Appointment Confirmed",
        "customer notification title",
    )
    customer_notification_id = int(customer_notification["id"])
    customer_detail = request_json(
        "GET",
        f"/notifications/{customer_notification_id}",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(customer_detail["id"], customer_notification_id, "customer notification detail id")
    marked = request_json(
        "PATCH",
        f"/notifications/{customer_notification_id}/read",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(marked["is_read"], True, "customer notification marked read")
    customer_unread_after = request_json(
        "GET",
        "/notifications/unread-count",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(customer_unread_after["unread_count"], 0, "customer unread after mark read")

    return {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "appointment_id": appointment_id,
        "avatar_url": avatar_url,
        "uploaded_image_count": len(image_urls),
        "admin_notification_id": admin_notification_id,
        "customer_notification_id": customer_notification_id,
        "appointment_status": confirmed["status"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    uploaded_urls: List[str] = []
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed, uploaded_urls)
        log("OK: upload + notification regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: upload + notification regression failed: {exc}")
        return 1
    finally:
        cleanup_uploaded_files(uploaded_urls)
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
