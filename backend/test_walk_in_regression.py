"""End-to-end regression script for admin walk-in quick create flow.

Flow covered:
1. Cleanup dynamic regression data
2. Seed store admin/store/service/hours
3. Login as admin portal store admin
4. Search non-existing walk-in customer by phone
5. Create admin walk-in appointment for new customer
6. Validate lightweight customer creation, booking_source, status, and booked_by_user_id
7. Search same phone again and validate it resolves to the created customer

Usage:
  cd backend
  python test_walk_in_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any, Dict, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.appointment import Appointment
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550444")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "WalkInAdmin123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "walkin_store_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "4151234567")
CUSTOMER_NAME = os.getenv("CUSTOMER_NAME", "Walk In Customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Walk-In Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Walk-In Gel Set")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "88"))

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
    token: str | None = None,
    expected_statuses: Tuple[int, ...] = (200,),
    params: Dict[str, Any] | None = None,
    **kwargs: Any,
) -> Dict[str, Any] | list[Any]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = kwargs.pop("json", None)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers = {**headers, "Content-Type": "application/json"}
    query = ""
    if params:
        from urllib.parse import urlencode
        query = f"?{urlencode(params)}"
    req = urllib.request.Request(
        url=f"{BASE_URL}{path}{query}",
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

    payload = json.loads(raw) if raw else {}
    if status not in expected_statuses:
        raise RuntimeError(f"{method} {path} failed: status={status}, body={payload}")
    return payload


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


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
    log("[STEP] Seed store admin/store/service")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="400 Walkin Ave",
            city="New York",
            state="NY",
            zip_code="10011",
            phone=normalize_phone(ADMIN_PHONE),
            email="walkin@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression walk-in store",
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
            category="Regression",
            price=SERVICE_PRICE,
            duration_minutes=60,
            is_active=1,
        )
        db.add(service)
        db.flush()

        admin_user = User(
            phone=normalize_phone(ADMIN_PHONE),
            username=ADMIN_USERNAME,
            password_hash=get_password_hash(ADMIN_PASSWORD),
            full_name="Walk In Store Admin",
            phone_verified=True,
            is_active=True,
            is_admin=False,
            store_id=store.id,
            store_admin_status="approved",
        )
        db.add(admin_user)
        db.commit()
        return SeedResult(admin_user_id=int(admin_user.id), store_id=int(store.id), service_id=int(service.id))
    finally:
        db.close()


def login_admin() -> str:
    log("[STEP] Login store admin")
    payload = request_json(
        "POST",
        "/auth/login",
        json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD, "login_portal": "admin"},
    )
    token = payload.get("access_token")
    assert_true(isinstance(token, str) and len(token) > 20, "Admin access token missing")
    return token


def run_flow(seed: SeedResult) -> None:
    token = login_admin()

    log("[STEP] Search non-existing customer by phone")
    search_before = request_json(
        "GET",
        "/appointments/admin/walk-in/customer-search",
        token=token,
        params={"phone": CUSTOMER_PHONE, "store_id": seed.store_id},
    )
    assert_equal(search_before.get("customer"), None, "Search before create should be empty")

    appointment_day = date.today() + timedelta(days=1)
    log("[STEP] Create admin walk-in appointment")
    created = request_json(
        "POST",
        "/appointments/admin/walk-in",
        token=token,
        json={
            "phone": CUSTOMER_PHONE,
            "full_name": CUSTOMER_NAME,
            "store_id": seed.store_id,
            "service_id": seed.service_id,
            "appointment_date": appointment_day.isoformat(),
            "appointment_time": "10:00:00",
            "notes": "walk-in regression",
            "skip_notifications": True,
        },
    )
    appointment_id = int(created["id"])
    assert_equal(created.get("status"), "confirmed", "Walk-in appointment status")
    assert_equal(created.get("booking_source"), "admin_walk_in", "Walk-in booking source")
    assert_equal(int(created.get("booked_by_user_id") or 0), seed.admin_user_id, "Walk-in booked_by_user_id")

    log("[STEP] Validate DB row and lightweight customer")
    db: Session = SessionLocal()
    try:
        customer = db.query(User).filter(User.phone == normalize_phone(CUSTOMER_PHONE)).first()
        assert_true(customer is not None, "Walk-in customer should be created")
        assert_equal(customer.full_name, CUSTOMER_NAME, "Walk-in customer full_name")
        assert_equal(bool(customer.phone_verified), False, "Walk-in customer should stay unverified")

        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        assert_true(appointment is not None, "Created walk-in appointment missing")
        assert_equal(int(appointment.user_id), int(customer.id), "Walk-in appointment user_id")
        assert_equal(appointment.booking_source, "admin_walk_in", "DB booking_source")
        assert_equal(int(appointment.booked_by_user_id or 0), seed.admin_user_id, "DB booked_by_user_id")
    finally:
        db.close()

    log("[STEP] Search same customer again")
    search_after = request_json(
        "GET",
        "/appointments/admin/walk-in/customer-search",
        token=token,
        params={"phone": CUSTOMER_PHONE, "store_id": seed.store_id},
    )
    customer_after = search_after.get("customer") or {}
    assert_equal(customer_after.get("phone"), normalize_phone(CUSTOMER_PHONE), "Search after create phone")
    assert_equal(customer_after.get("full_name"), CUSTOMER_NAME, "Search after create full_name")
    assert_true(int(customer_after.get("store_visit_count") or 0) >= 1, "Store visit count should be populated")

    log("[PASS] walk-in regression passed")


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    seed = seed_minimal_data()
    try:
        run_flow(seed)
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        raise
