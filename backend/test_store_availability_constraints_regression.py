"""
End-to-end regression script for store availability constraints.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service/technician
3. Register customer and login admin/customer
4. Create a store blocked slot and verify public blocked slots + available-slots filtering + booking rejection
5. Create a store holiday and verify holiday check + available-slots empty + booking rejection
6. Create a technician unavailable period and verify public unavailable list + available-slots filtering + booking rejection
7. Create a valid appointment outside unavailable window to confirm booking still works

Usage:
  cd backend
  python test_store_availability_constraints_regression.py
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
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.technician import Technician
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550198")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "availability_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663606")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "AvailabilityPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "availability_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Availability Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Availability Constraint Service")
TECHNICIAN_NAME = os.getenv("TECHNICIAN_NAME", "Regression Technician")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "64"))
SERVICE_DURATION_MINUTES = int(os.getenv("SERVICE_DURATION_MINUTES", "60"))

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
    "store_holidays",
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
    technician_id: int


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


def assert_contains(haystack: str, needle: str, label: str) -> None:
    if needle not in haystack:
        raise AssertionError(f"{label}: expected {needle!r} in {haystack!r}")


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
    log("[STEP] Seed minimal admin/store/service/technician")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="654 Constraint Ave",
            city="New York",
            state="NY",
            zip_code="10009",
            phone=normalize_phone(ADMIN_PHONE),
            email="availability@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression availability test store",
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
            description="Regression availability test service",
            price=SERVICE_PRICE,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=SERVICE_DURATION_MINUTES,
            category="Nails",
            is_active=1,
        )
        db.add(service)
        db.flush()

        technician = Technician(
            store_id=store.id,
            name=TECHNICIAN_NAME,
            phone="12125550999",
            email="tech@example.com",
            bio="Regression availability technician",
            specialties="Gel,Art",
            years_of_experience=5,
            is_active=1,
        )
        db.add(technician)
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Availability Admin",
            email="availability-admin@example.com",
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
        db.refresh(technician)
        db.refresh(admin)
        return SeedResult(
            admin_user_id=int(admin.id),
            store_id=int(store.id),
            service_id=int(service.id),
            technician_id=int(technician.id),
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
            "full_name": "Availability Customer",
            "email": "availability-customer@example.com",
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


def extract_slot_starts(slots: List[Dict[str, Any]]) -> List[str]:
    return [str(item.get("start_time")) for item in slots]


def create_customer_appointment(
    customer_token: str,
    store_id: int,
    service_id: int,
    technician_id: int,
    appointment_date: str,
    appointment_time: str,
    notes: str,
    expected_statuses: Tuple[int, ...] = (200, 201),
) -> Dict[str, Any] | List[Any]:
    return request_json(
        "POST",
        "/appointments/",
        token=customer_token,
        expected_statuses=expected_statuses,
        json={
            "store_id": store_id,
            "service_id": service_id,
            "technician_id": technician_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "notes": notes,
        },
    )


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_user = register_customer()
    customer_user_id = int(customer_user["id"])

    log("[STEP] Admin and customer login")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    blocked_date = (date.today() + timedelta(days=1)).isoformat()
    holiday_date = (date.today() + timedelta(days=2)).isoformat()
    unavailable_date = (date.today() + timedelta(days=3)).isoformat()

    log("[STEP] Blocked slot should filter available slots and reject booking")
    blocked_slot = request_json(
        "POST",
        f"/stores/{seed.store_id}/blocked-slots",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "blocked_date": blocked_date,
            "start_time": "10:00:00",
            "end_time": "12:00:00",
            "reason": "Staff meeting",
            "status": "active",
        },
    )
    blocked_public = request_json(
        "GET",
        f"/stores/{seed.store_id}/blocked-slots/public?date={blocked_date}",
        expected_statuses=(200,),
    )
    assert_equal(len(blocked_public), 1, "blocked slot public count")
    assert_equal(blocked_public[0]["reason"], "Staff meeting", "blocked slot public reason")

    blocked_slots = request_json(
        "GET",
        f"/technicians/{seed.technician_id}/available-slots?date={blocked_date}&service_id={seed.service_id}",
        expected_statuses=(200,),
    )
    blocked_starts = extract_slot_starts(blocked_slots)
    assert_true("09:00" in blocked_starts, "09:00 should remain available before blocked slot")
    assert_true("10:00" not in blocked_starts, "10:00 should be removed by blocked slot")
    assert_true("12:00" in blocked_starts, "12:00 should reopen after blocked slot")

    blocked_reject = create_customer_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        seed.technician_id,
        blocked_date,
        "10:30:00",
        "blocked slot regression",
        expected_statuses=(400,),
    )
    assert_contains(str(blocked_reject["detail"]), "blocked by store", "blocked slot rejection")

    log("[STEP] Store holiday should empty available slots and reject booking")
    holiday = request_json(
        "POST",
        f"/stores/holidays/{seed.store_id}",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "holiday_date": holiday_date,
            "name": "Regression Holiday",
            "description": "Closed for regression holiday",
        },
    )
    holiday_check = request_json(
        "GET",
        f"/stores/holidays/{seed.store_id}/check/{holiday_date}",
        expected_statuses=(200,),
    )
    assert_equal(holiday_check["is_holiday"], True, "holiday check")
    holiday_list = request_json(
        "GET",
        f"/stores/holidays/{seed.store_id}?start_date={holiday_date}&end_date={holiday_date}",
        expected_statuses=(200,),
    )
    assert_equal(len(holiday_list), 1, "holiday list count")
    assert_equal(holiday_list[0]["name"], "Regression Holiday", "holiday list name")

    holiday_slots = request_json(
        "GET",
        f"/technicians/{seed.technician_id}/available-slots?date={holiday_date}&service_id={seed.service_id}",
        expected_statuses=(200,),
    )
    assert_equal(holiday_slots, [], "holiday should return no available slots")

    holiday_reject = create_customer_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        seed.technician_id,
        holiday_date,
        "10:00:00",
        "holiday regression",
        expected_statuses=(400,),
    )
    assert_contains(str(holiday_reject["detail"]), "closed on this date", "holiday rejection")

    log("[STEP] Technician unavailable should filter slots and reject overlapping booking")
    unavailable = request_json(
        "POST",
        f"/technicians/{seed.technician_id}/unavailable",
        token=admin_token,
        expected_statuses=(201,),
        json={
            "start_date": unavailable_date,
            "end_date": unavailable_date,
            "start_time": "13:00:00",
            "end_time": "15:00:00",
            "reason": "Training",
        },
    )
    unavailable_list = request_json(
        "GET",
        f"/technicians/{seed.technician_id}/unavailable?start_date={unavailable_date}&end_date={unavailable_date}",
        expected_statuses=(200,),
    )
    assert_equal(len(unavailable_list), 1, "unavailable period count")
    assert_equal(unavailable_list[0]["reason"], "Training", "unavailable reason")

    unavailable_slots = request_json(
        "GET",
        f"/technicians/{seed.technician_id}/available-slots?date={unavailable_date}&service_id={seed.service_id}",
        expected_statuses=(200,),
    )
    unavailable_starts = extract_slot_starts(unavailable_slots)
    assert_true("12:00" in unavailable_starts, "12:00 should remain available before unavailable window")
    assert_true("13:00" not in unavailable_starts, "13:00 should be removed by technician unavailable")
    assert_true("15:00" in unavailable_starts, "15:00 should reopen after technician unavailable")

    unavailable_reject = create_customer_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        seed.technician_id,
        unavailable_date,
        "13:30:00",
        "technician unavailable regression",
        expected_statuses=(400,),
    )
    assert_equal(
        unavailable_reject["detail"],
        "Selected technician is unavailable for this time.",
        "technician unavailable rejection",
    )

    valid_appointment = create_customer_appointment(
        customer_token,
        seed.store_id,
        seed.service_id,
        seed.technician_id,
        unavailable_date,
        "15:00:00",
        "valid availability regression",
    )
    assert_equal(valid_appointment["status"], "pending", "valid appointment status")
    assert_equal(valid_appointment["technician_id"], seed.technician_id, "valid appointment technician")

    my_appointments = request_json(
        "GET",
        "/appointments/?skip=0&limit=20",
        token=customer_token,
        expected_statuses=(200,),
    )
    created = next(item for item in my_appointments if int(item["id"]) == int(valid_appointment["id"]))
    assert_equal(created["status"], "pending", "valid appointment list status")

    return {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "blocked_slot_id": int(blocked_slot["id"]),
        "holiday_id": int(holiday["id"]),
        "technician_unavailable_id": int(unavailable["id"]),
        "valid_appointment_id": int(valid_appointment["id"]),
        "blocked_slot_public_count": len(blocked_public),
        "holiday_slot_count": len(holiday_slots),
        "unavailable_remaining_slots": unavailable_starts,
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: availability constraints regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: availability constraints regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
