"""
End-to-end regression script for appointment complete + no-show flows.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service
3. Register customer and login admin/customer
4. Customer creates two appointments and admin confirms both
5. Admin completes appointment A
6. Validate completed status, payment fields, points, and notifications
7. Verify completed appointment cannot be marked as no-show
8. Admin marks appointment B as no-show
9. Validate cancelled status, risk side effects, and notifications
10. Verify no-show appointment cannot be completed

Usage:
  cd backend
  python test_complete_no_show_regression.py
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
from app.models.point_transaction import PointTransaction
from app.models.risk import RiskEvent, UserRiskState
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User
from app.models.user_points import UserPoints


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550198")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "complete_noshow_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663606")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "CompletePass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "complete_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Complete NoShow Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Complete NoShow Service")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "72"))

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


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def assert_close(actual: Any, expected: float, label: str, eps: float = 0.01) -> None:
    if abs(float(actual) - float(expected)) > eps:
        raise AssertionError(f"{label}: expected {expected}, got {actual}")


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
            address="321 Complete Ave",
            city="New York",
            state="NY",
            zip_code="10007",
            phone=normalize_phone(ADMIN_PHONE),
            email="complete-noshow@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression complete/no-show test store",
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
            description="Regression complete/no-show service",
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
            full_name="Complete NoShow Admin",
            email="complete-noshow-admin@example.com",
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
    log("[STEP] Register customer")
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
            "full_name": "Complete NoShow Customer",
            "email": "complete-customer@example.com",
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
    return token


def create_appointment(
    customer_token: str,
    store_id: int,
    service_id: int,
    appointment_date: str,
    appointment_time: str,
    notes: str,
) -> Dict[str, Any]:
    return request_json(
        "POST",
        "/appointments/",
        token=customer_token,
        expected_statuses=(200, 201),
        json={
            "store_id": store_id,
            "service_id": service_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "notes": notes,
        },
    )


def fetch_point_amounts(user_id: int, appointment_id: int) -> List[int]:
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(PointTransaction.amount)
            .join(UserPoints, UserPoints.id == PointTransaction.user_points_id)
            .filter(
                UserPoints.user_id == user_id,
                PointTransaction.reference_type == "appointment",
                PointTransaction.reference_id == appointment_id,
            )
            .all()
        )
        return [int(row.amount or 0) for row in rows]
    finally:
        db.close()


def fetch_no_show_state(user_id: int, appointment_id: int) -> Tuple[int, Optional[UserRiskState]]:
    db: Session = SessionLocal()
    try:
        no_show_count = (
            db.query(RiskEvent)
            .filter(
                RiskEvent.user_id == user_id,
                RiskEvent.appointment_id == appointment_id,
                RiskEvent.event_type == "appointment_no_show",
            )
            .count()
        )
        state = db.query(UserRiskState).filter(UserRiskState.user_id == user_id).first()
        return no_show_count, state
    finally:
        db.close()


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_user = register_customer()
    customer_user_id = int(customer_user["id"])

    log("[STEP] Admin and customer login")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    appointment_a_date = (date.today() + timedelta(days=1)).isoformat()
    appointment_b_date = (date.today() + timedelta(days=2)).isoformat()

    log("[STEP] Create, confirm, and complete appointment A")
    appointment_a = create_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        appointment_a_date,
        "10:00:00",
        "complete regression flow",
    )
    appointment_a_id = int(appointment_a["id"])
    confirmed_a = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed_a["status"], "confirmed", "appointment A confirmed status")

    completed_a = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/complete",
        token=admin_token,
        expected_statuses=(200,),
        json={},
    )
    assert_equal(completed_a["status"], "completed", "appointment A completed status")
    assert_equal(completed_a["payment_status"], "paid", "appointment A payment status")
    assert_close(completed_a["paid_amount"], SERVICE_PRICE, "appointment A paid amount")
    assert_true(bool(completed_a.get("completed_at")), "appointment A completed_at missing")

    points_balance = request_json("GET", "/points/balance", token=customer_token, expected_statuses=(200,))
    assert_equal(points_balance["available_points"], int(SERVICE_PRICE), "points after complete")
    point_amounts = fetch_point_amounts(customer_user_id, appointment_a_id)
    assert_equal(point_amounts, [int(SERVICE_PRICE)], "point transaction amounts for appointment A")

    notifications_after_complete = request_json(
        "GET",
        "/notifications?skip=0&limit=20",
        token=customer_token,
        expected_statuses=(200,),
    )
    complete_types = {item["type"] for item in notifications_after_complete if int(item.get("appointment_id") or 0) == appointment_a_id}
    assert_equal(
        complete_types,
        {"appointment_confirmed", "appointment_completed", "points_earned"},
        "appointment A notification types",
    )
    unread_after_complete = request_json(
        "GET",
        "/notifications/unread-count",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(unread_after_complete["unread_count"], 3, "unread count after complete")

    no_show_completed = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/no-show",
        token=admin_token,
        expected_statuses=(400,),
    )
    assert_equal(no_show_completed["detail"], "Cannot mark completed appointment as no-show", "completed appointment no-show guard")

    log("[STEP] Create, confirm, and mark appointment B as no-show")
    appointment_b = create_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        appointment_b_date,
        "11:30:00",
        "no-show regression flow",
    )
    appointment_b_id = int(appointment_b["id"])
    confirmed_b = request_json(
        "PATCH",
        f"/appointments/{appointment_b_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed_b["status"], "confirmed", "appointment B confirmed status")

    no_show_b = request_json(
        "POST",
        f"/appointments/{appointment_b_id}/no-show",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(no_show_b["status"], "cancelled", "appointment B no-show status")
    assert_equal(no_show_b["cancel_reason"], "No show", "appointment B no-show reason")

    complete_cancelled = request_json(
        "PATCH",
        f"/appointments/{appointment_b_id}/complete",
        token=admin_token,
        expected_statuses=(400,),
        json={},
    )
    assert_equal(complete_cancelled["detail"], "Cannot complete a cancelled appointment", "cancelled appointment complete guard")

    risk_rows = request_json(
        "GET",
        f"/risk/users?keyword={normalize_phone(CUSTOMER_PHONE)}&include_full_phone=true&limit=20",
        token=admin_token,
        expected_statuses=(200,),
    )
    risk_row = next((row for row in risk_rows if int(row.get("user_id") or 0) == customer_user_id), None)
    assert_true(risk_row is not None, "risk row for customer missing")
    assert_equal(risk_row["phone"], normalize_phone(CUSTOMER_PHONE), "risk row phone")
    assert_equal(risk_row["no_show_30d"], 1, "risk row no_show_30d")
    assert_equal(risk_row["cancel_7d"], 1, "risk row cancel_7d")

    no_show_event_count, risk_state = fetch_no_show_state(customer_user_id, appointment_b_id)
    assert_equal(no_show_event_count, 1, "risk event count for appointment B")
    assert_true(risk_state is not None, "risk state missing")
    assert_equal(int(risk_state.no_show_30d or 0), 1, "risk state no_show_30d")
    assert_equal(int(risk_state.cancel_7d or 0), 1, "risk state cancel_7d")

    customer_notifications = request_json(
        "GET",
        "/notifications?skip=0&limit=20",
        token=customer_token,
        expected_statuses=(200,),
    )
    no_show_types = {item["type"] for item in customer_notifications if int(item.get("appointment_id") or 0) == appointment_b_id}
    assert_equal(
        no_show_types,
        {"appointment_confirmed", "appointment_cancelled"},
        "appointment B notification types",
    )
    unread_after_no_show = request_json(
        "GET",
        "/notifications/unread-count",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(unread_after_no_show["unread_count"], 5, "unread count after no-show")

    my_appointments = request_json(
        "GET",
        "/appointments/?skip=0&limit=20",
        token=customer_token,
        expected_statuses=(200,),
    )
    appointment_a_row = next(item for item in my_appointments if int(item["id"]) == appointment_a_id)
    appointment_b_row = next(item for item in my_appointments if int(item["id"]) == appointment_b_id)
    assert_equal(appointment_a_row["status"], "completed", "appointment A list status")
    assert_equal(appointment_b_row["status"], "cancelled", "appointment B list status")

    return {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "appointment_completed_id": appointment_a_id,
        "appointment_no_show_id": appointment_b_id,
        "points_balance": points_balance["available_points"],
        "appointment_a_notification_types": sorted(complete_types),
        "appointment_b_notification_types": sorted(no_show_types),
        "risk_no_show_30d": risk_row["no_show_30d"],
        "risk_cancel_7d": risk_row["cancel_7d"],
        "unread_count": unread_after_no_show["unread_count"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: complete/no-show regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: complete/no-show regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
