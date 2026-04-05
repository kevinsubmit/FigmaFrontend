"""
End-to-end regression script for appointment reschedule + cancel flows.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service
3. Register two customers and login admin/customers
4. Customer A creates + admin confirms appointment, then customer A reschedules it
5. Validate original date/time, reschedule_count, status reset, and admin notification
6. Customer A creates another appointment and cancels it
7. Validate cancel_reason, cancelled_by, and admin notification
8. Customer B creates appointment and admin cancels it
9. Validate cancel_reason, cancelled_by, and customer notification

Usage:
  cd backend
  python test_reschedule_cancel_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.appointment import Appointment as AppointmentModel
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550198")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "reschedule_cancel_admin")

CUSTOMER_A_PHONE = os.getenv("CUSTOMER_A_PHONE", "2126663606")
CUSTOMER_A_PASSWORD = os.getenv("CUSTOMER_A_PASSWORD", "ReschedulePass123")
CUSTOMER_A_USERNAME = os.getenv("CUSTOMER_A_USERNAME", "reschedule_customer")

CUSTOMER_B_PHONE = os.getenv("CUSTOMER_B_PHONE", "2127773606")
CUSTOMER_B_PASSWORD = os.getenv("CUSTOMER_B_PASSWORD", "CancelPass123")
CUSTOMER_B_USERNAME = os.getenv("CUSTOMER_B_USERNAME", "cancel_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Reschedule Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Reschedule Cancel Service")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "68"))

TRUNCATE_TABLES: Sequence[str] = (
    "appointment_groups",
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


def log(message: str) -> None:
    print(message, flush=True)


def request_json(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
    **kwargs: Any,
) -> Dict[str, Any] | List[Any]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = kwargs.pop("json", None)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(
        url=f"{BASE_URL}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            raw = response.read().decode("utf-8") if response.length != 0 else ""
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read().decode("utf-8") if exc.fp else ""
    except urllib.error.URLError as exc:
        raise RuntimeError(f"{method} {path} failed to connect: {exc}") from exc

    try:
        payload = json.loads(raw) if raw else {}
    except Exception:
        payload = {"raw": raw}

    if status not in expected_statuses:
        raise RuntimeError(f"{method} {path} failed: status={status}, body={payload}")
    return payload


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return f"1{digits}"
    return digits


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


def seed_minimal_data() -> SeedResult:
    log("[STEP] Seed minimal admin/store/service")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="987 Flow Ave",
            city="New York",
            state="NY",
            zip_code="10005",
            phone=normalize_phone(ADMIN_PHONE),
            email="reschedule@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression reschedule cancel test store",
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
            description="Regression reschedule cancel service",
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
            full_name="Reschedule Cancel Admin",
            email="reschedule-admin@example.com",
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


def register_customer(phone: str, username: str, password: str, full_name: str, email: str) -> Dict[str, Any]:
    request_json(
        "POST",
        "/auth/send-verification-code",
        expected_statuses=(200,),
        json={"phone": phone, "purpose": "register"},
    )
    verify = request_json(
        "POST",
        "/auth/verify-code",
        expected_statuses=(200,),
        json={"phone": phone, "code": "123456", "purpose": "register"},
    )
    assert_equal(verify["valid"], True, f"{username} verification valid")
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": phone,
            "username": username,
            "full_name": full_name,
            "email": email,
            "password": password,
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


def create_appointment(token: str, seed: SeedResult, *, appointment_date: str, appointment_time: str, notes: str) -> Dict[str, Any]:
    return request_json(
        "POST",
        "/appointments/",
        token=token,
        expected_statuses=(200, 201),
        json={
            "store_id": seed.store_id,
            "service_id": seed.service_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "notes": notes,
        },
    )


def fetch_appointment_row(appointment_id: int) -> AppointmentModel:
    db: Session = SessionLocal()
    try:
        row = db.query(AppointmentModel).filter(AppointmentModel.id == int(appointment_id)).first()
        if not row:
            raise RuntimeError(f"appointment row not found: {appointment_id}")
        db.expunge(row)
        return row
    finally:
        db.close()


def find_notification(items: List[Dict[str, Any]], *, appointment_id: int, title: str) -> Dict[str, Any]:
    for item in items:
        if int(item.get("appointment_id") or 0) == int(appointment_id) and item.get("title") == title:
            return item
    raise AssertionError(f"notification not found: appointment_id={appointment_id}, title={title}")


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_a = register_customer(
        CUSTOMER_A_PHONE,
        CUSTOMER_A_USERNAME,
        CUSTOMER_A_PASSWORD,
        "Reschedule Customer",
        "reschedule-customer@example.com",
    )
    customer_b = register_customer(
        CUSTOMER_B_PHONE,
        CUSTOMER_B_USERNAME,
        CUSTOMER_B_PASSWORD,
        "Cancel Customer",
        "cancel-customer@example.com",
    )

    log("[STEP] Login admin and customers")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_a_token = login(CUSTOMER_A_PHONE, CUSTOMER_A_PASSWORD, "frontend")
    customer_b_token = login(CUSTOMER_B_PHONE, CUSTOMER_B_PASSWORD, "frontend")

    log("[STEP] Create + confirm appointment A, then reschedule it")
    appointment_a_date = (date.today() + timedelta(days=1)).isoformat()
    appointment_a = create_appointment(
        customer_a_token,
        seed,
        appointment_date=appointment_a_date,
        appointment_time="10:00:00",
        notes="reschedule baseline",
    )
    appointment_a_id = int(appointment_a["id"])
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=customer_a_token,
        expected_statuses=(200,),
    )

    rescheduled_date = (date.today() + timedelta(days=2)).isoformat()
    rescheduled = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/reschedule",
        token=customer_a_token,
        expected_statuses=(200,),
        json={"new_date": rescheduled_date, "new_time": "11:30:00"},
    )
    assert_equal(rescheduled["status"], "pending", "rescheduled status reset to pending")
    assert_equal(str(rescheduled["appointment_date"]), rescheduled_date, "rescheduled appointment_date")
    assert_equal(str(rescheduled["appointment_time"]), "11:30:00", "rescheduled appointment_time")

    appointment_a_row = fetch_appointment_row(appointment_a_id)
    assert_equal(str(appointment_a_row.original_date), appointment_a_date, "original_date captured on first reschedule")
    assert_equal(str(appointment_a_row.original_time), "10:00:00", "original_time captured on first reschedule")
    assert_equal(int(appointment_a_row.reschedule_count or 0), 1, "reschedule_count after first reschedule")

    admin_unread_after_reschedule = request_json(
        "GET",
        "/notifications/unread-count",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(admin_unread_after_reschedule["unread_count"], 1, "admin unread after reschedule")
    admin_reschedule_notifications = request_json(
        "GET",
        "/notifications/?skip=0&limit=10&unread_only=true",
        token=admin_token,
        expected_statuses=(200,),
    )
    reschedule_notification = find_notification(
        admin_reschedule_notifications,
        appointment_id=appointment_a_id,
        title="Appointment Rescheduled",
    )

    log("[STEP] Create appointment B, then customer cancels it")
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    appointment_b = create_appointment(
        customer_a_token,
        seed,
        appointment_date=(date.today() + timedelta(days=3)).isoformat(),
        appointment_time="12:00:00",
        notes="customer cancel flow",
    )
    appointment_b_id = int(appointment_b["id"])
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    customer_cancel_reason = "Customer changed plan"
    customer_cancelled = request_json(
        "POST",
        f"/appointments/{appointment_b_id}/cancel",
        token=customer_a_token,
        expected_statuses=(200,),
        json={"cancel_reason": customer_cancel_reason},
    )
    assert_equal(customer_cancelled["status"], "cancelled", "customer cancelled status")
    assert_equal(customer_cancelled["cancel_reason"], customer_cancel_reason, "customer cancelled reason")

    appointment_b_row = fetch_appointment_row(appointment_b_id)
    assert_equal(int(appointment_b_row.cancelled_by or 0), int(customer_a["id"]), "customer cancelled_by")

    admin_unread_after_customer_cancel = request_json(
        "GET",
        "/notifications/unread-count",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(admin_unread_after_customer_cancel["unread_count"], 1, "admin unread after customer cancel")
    admin_cancel_notifications = request_json(
        "GET",
        "/notifications/?skip=0&limit=10&unread_only=true",
        token=admin_token,
        expected_statuses=(200,),
    )
    customer_cancel_notification = find_notification(
        admin_cancel_notifications,
        appointment_id=appointment_b_id,
        title="Appointment Cancelled",
    )

    log("[STEP] Create appointment C, then admin cancels it")
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=customer_b_token,
        expected_statuses=(200,),
    )
    appointment_c = create_appointment(
        customer_b_token,
        seed,
        appointment_date=(date.today() + timedelta(days=4)).isoformat(),
        appointment_time="13:00:00",
        notes="admin cancel flow",
    )
    appointment_c_id = int(appointment_c["id"])
    request_json(
        "POST",
        "/notifications/mark-all-read",
        token=admin_token,
        expected_statuses=(200,),
    )
    admin_cancel_reason = "Store unavailable"
    admin_cancelled = request_json(
        "PUT",
        f"/appointments/{appointment_c_id}/status",
        token=admin_token,
        expected_statuses=(200,),
        json={"status": "cancelled", "cancel_reason": admin_cancel_reason},
    )
    assert_equal(admin_cancelled["status"], "cancelled", "admin cancelled status")
    assert_equal(admin_cancelled["cancel_reason"], admin_cancel_reason, "admin cancelled reason")

    appointment_c_row = fetch_appointment_row(appointment_c_id)
    assert_equal(int(appointment_c_row.cancelled_by or 0), int(seed.admin_user_id), "admin cancelled_by")

    customer_b_unread_after_admin_cancel = request_json(
        "GET",
        "/notifications/unread-count",
        token=customer_b_token,
        expected_statuses=(200,),
    )
    assert_equal(customer_b_unread_after_admin_cancel["unread_count"], 1, "customer unread after admin cancel")
    customer_b_cancel_notifications = request_json(
        "GET",
        "/notifications/?skip=0&limit=10&unread_only=true",
        token=customer_b_token,
        expected_statuses=(200,),
    )
    admin_cancel_notification = find_notification(
        customer_b_cancel_notifications,
        appointment_id=appointment_c_id,
        title="Appointment Cancelled",
    )

    return {
        "admin_user_id": seed.admin_user_id,
        "customer_a_user_id": int(customer_a["id"]),
        "customer_b_user_id": int(customer_b["id"]),
        "rescheduled_appointment_id": appointment_a_id,
        "customer_cancelled_appointment_id": appointment_b_id,
        "admin_cancelled_appointment_id": appointment_c_id,
        "reschedule_notification_id": int(reschedule_notification["id"]),
        "customer_cancel_notification_id": int(customer_cancel_notification["id"]),
        "admin_cancel_notification_id": int(admin_cancel_notification["id"]),
        "reschedule_count": int(appointment_a_row.reschedule_count or 0),
        "admin_cancelled_by": int(appointment_c_row.cancelled_by or 0),
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: reschedule + cancel regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: reschedule + cancel regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
