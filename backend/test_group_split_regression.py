"""
End-to-end regression script for appointment group + technician split + settlement.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service/two technicians
3. Register host customer and one registered guest customer
4. Host creates appointment group with one unregistered guest
5. Host appends one registered guest into the same group
6. Admin confirms host and guest appointments
7. Admin applies multi-technician split on host appointment
8. Admin settles host appointment
9. Validate group payload, split payload, owner resolution, and points side effects

Usage:
  cd backend
  python test_group_split_regression.py

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
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "group_split_admin")

HOST_PHONE = os.getenv("HOST_PHONE", "2126663606")
HOST_PASSWORD = os.getenv("HOST_PASSWORD", "HostPass123")
HOST_USERNAME = os.getenv("HOST_USERNAME", "group_host")

REGISTERED_GUEST_PHONE = os.getenv("REGISTERED_GUEST_PHONE", "2127773606")
REGISTERED_GUEST_PASSWORD = os.getenv("REGISTERED_GUEST_PASSWORD", "GuestPass123")
REGISTERED_GUEST_USERNAME = os.getenv("REGISTERED_GUEST_USERNAME", "group_guest")

UNREGISTERED_GUEST_PHONE = os.getenv("UNREGISTERED_GUEST_PHONE", "2128883606")

STORE_NAME = os.getenv("STORE_NAME", "Regression Group Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Group Gel Set")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "70"))

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
    technician_ids: Tuple[int, int]


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
    log("[STEP] Seed minimal admin/store/service/two technicians")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="456 Group Ave",
            city="New York",
            state="NY",
            zip_code="10002",
            phone=normalize_phone(ADMIN_PHONE),
            email="groups@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression group split test store",
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
            description="Regression group split service",
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

        tech_one = Technician(
            store_id=store.id,
            name="Tech Alpha",
            phone="12125550111",
            email="alpha@example.com",
            is_active=1,
        )
        tech_two = Technician(
            store_id=store.id,
            name="Tech Beta",
            phone="12125550112",
            email="beta@example.com",
            is_active=1,
        )
        db.add(tech_one)
        db.add(tech_two)
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Group Split Admin",
            email="admin@example.com",
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
        db.refresh(tech_one)
        db.refresh(tech_two)
        db.refresh(admin)
        return SeedResult(
            admin_user_id=int(admin.id),
            store_id=int(store.id),
            service_id=int(service.id),
            technician_ids=(int(tech_one.id), int(tech_two.id)),
        )
    finally:
        db.close()


def register_user(phone: str, username: str, password: str, full_name: str, email: str) -> Dict[str, Any]:
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
    assert_equal(verify["valid"], True, f"verification valid for {phone}")
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
    return token


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    host_user = register_user(HOST_PHONE, HOST_USERNAME, HOST_PASSWORD, "Group Host", "host@example.com")
    registered_guest_user = register_user(
        REGISTERED_GUEST_PHONE,
        REGISTERED_GUEST_USERNAME,
        REGISTERED_GUEST_PASSWORD,
        "Registered Guest",
        "guest@example.com",
    )

    host_user_id = int(host_user["id"])
    registered_guest_user_id = int(registered_guest_user["id"])

    log("[STEP] Login admin/host/registered guest")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    host_token = login(HOST_PHONE, HOST_PASSWORD, "frontend")
    guest_token = login(REGISTERED_GUEST_PHONE, REGISTERED_GUEST_PASSWORD, "frontend")

    group_date = (date.today() + timedelta(days=1)).isoformat()

    log("[STEP] Host creates appointment group with one unregistered guest")
    group = request_json(
        "POST",
        "/appointments/groups",
        token=host_token,
        expected_statuses=(200,),
        json={
            "store_id": seed.store_id,
            "appointment_date": group_date,
            "appointment_time": "11:00:00",
            "host_service_id": seed.service_id,
            "host_technician_id": seed.technician_ids[0],
            "host_notes": "group host booking",
            "guests": [
                {
                    "service_id": seed.service_id,
                    "technician_id": seed.technician_ids[1],
                    "guest_name": "Offline Guest",
                    "guest_phone": UNREGISTERED_GUEST_PHONE,
                    "notes": "first guest",
                }
            ],
        },
    )
    group_id = int(group["group_id"])
    host_appointment = group["host_appointment"]
    host_appointment_id = int(host_appointment["id"])
    guest_appointments = group["guest_appointments"]
    assert_equal(len(guest_appointments), 1, "initial guest count")
    offline_guest = guest_appointments[0]
    offline_guest_id = int(offline_guest["id"])
    assert_equal(offline_guest["guest_name"], "Offline Guest", "offline guest name")
    assert_equal(offline_guest["guest_phone"], normalize_phone(UNREGISTERED_GUEST_PHONE), "offline guest phone snapshot")
    assert_equal(offline_guest["user_id"], host_user_id, "offline guest owner falls back to host")
    assert_equal(host_appointment["is_group_host"], True, "host group flag")

    log("[STEP] Append one registered guest into the group")
    appended = request_json(
        "POST",
        f"/appointments/groups/{group_id}/guests",
        token=host_token,
        expected_statuses=(200,),
        json={
            "guests": [
                {
                    "service_id": seed.service_id,
                    "guest_name": "Registered Guest",
                    "guest_phone": REGISTERED_GUEST_PHONE,
                    "notes": "second guest",
                }
            ]
        },
    )
    appended_guests = appended["guest_appointments"]
    assert_equal(len(appended_guests), 1, "appended guest count")
    registered_guest = appended_guests[0]
    registered_guest_appointment_id = int(registered_guest["id"])
    assert_equal(registered_guest["user_id"], registered_guest_user_id, "registered guest owner resolution")

    log("[STEP] Verify full group payload as admin")
    full_group = request_json(
        "GET",
        f"/appointments/groups/{group_id}",
        token=admin_token,
        expected_statuses=(200,),
    )
    all_guest_ids = sorted(int(item["id"]) for item in full_group["guest_appointments"])
    assert_equal(all_guest_ids, sorted([offline_guest_id, registered_guest_appointment_id]), "full group guest ids")

    log("[STEP] Confirm host and guest appointments")
    for appointment_id in (host_appointment_id, offline_guest_id, registered_guest_appointment_id):
        confirmed = request_json(
            "PATCH",
            f"/appointments/{appointment_id}/confirm",
            token=admin_token,
            expected_statuses=(200,),
        )
        assert_equal(confirmed["status"], "confirmed", f"confirmed status for appointment {appointment_id}")

    log("[STEP] Apply two-technician split on host appointment")
    split_summary = request_json(
        "PUT",
        f"/appointments/{host_appointment_id}/splits",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "splits": [
                {
                    "technician_id": seed.technician_ids[0],
                    "service_id": seed.service_id,
                    "amount": 40,
                },
                {
                    "technician_id": seed.technician_ids[1],
                    "service_id": seed.service_id,
                    "amount": 30,
                },
            ]
        },
    )
    assert_close(split_summary["order_amount"], SERVICE_PRICE, "split order amount")
    assert_close(split_summary["split_total"], SERVICE_PRICE, "split total")
    assert_equal(split_summary["is_balanced"], True, "split balanced")
    assert_equal(len(split_summary["splits"]), 2, "split item count")

    fetched_split_summary = request_json(
        "GET",
        f"/appointments/{host_appointment_id}/splits",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(len(fetched_split_summary["splits"]), 2, "fetched split count")

    log("[STEP] Settle host appointment")
    settled = request_json(
        "POST",
        f"/appointments/{host_appointment_id}/settle",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "idempotency_key": "group-settle-001",
            "original_amount": SERVICE_PRICE,
            "cash_paid_amount": SERVICE_PRICE,
        },
    )
    assert_equal(settled["settlement_status"], "settled", "host settlement status")
    assert_close(settled["cash_paid_amount"], SERVICE_PRICE, "host cash paid")
    assert_close(settled["final_paid_amount"], SERVICE_PRICE, "host final paid")
    assert_close(settled["gift_card_used_amount"], 0, "host gift used")

    log("[STEP] Validate host/guest side effects")
    host_points = request_json("GET", "/points/balance", token=host_token, expected_statuses=(200,))
    assert_equal(host_points["available_points"], int(SERVICE_PRICE), "host points after settlement")
    guest_points = request_json("GET", "/points/balance", token=guest_token, expected_statuses=(200,))
    assert_equal(guest_points["available_points"], 0, "registered guest points remain zero")

    host_appointments = request_json("GET", "/appointments/?skip=0&limit=20", token=host_token, expected_statuses=(200,))
    host_row = next(item for item in host_appointments if int(item["id"]) == host_appointment_id)
    offline_guest_row = next(item for item in host_appointments if int(item["id"]) == offline_guest_id)
    assert_equal(host_row["settlement_status"], "settled", "host list settlement status")
    assert_equal(offline_guest_row["settlement_status"], "unsettled", "offline guest remains unsettled")

    guest_appointments = request_json("GET", "/appointments/?skip=0&limit=20", token=guest_token, expected_statuses=(200,))
    registered_guest_row = next(item for item in guest_appointments if int(item["id"]) == registered_guest_appointment_id)
    assert_equal(registered_guest_row["group_id"], group_id, "registered guest group id")
    assert_equal(registered_guest_row["status"], "confirmed", "registered guest status")
    assert_equal(registered_guest_row["settlement_status"], "unsettled", "registered guest remains unsettled")

    final_group = request_json(
        "GET",
        f"/appointments/groups/{group_id}",
        token=admin_token,
        expected_statuses=(200,),
    )
    final_host = final_group["host_appointment"]
    assert_equal(final_host["settlement_status"], "settled", "group host settlement status")

    return {
        "admin_user_id": seed.admin_user_id,
        "host_user_id": host_user_id,
        "registered_guest_user_id": registered_guest_user_id,
        "group_id": group_id,
        "host_appointment_id": host_appointment_id,
        "offline_guest_appointment_id": offline_guest_id,
        "registered_guest_appointment_id": registered_guest_appointment_id,
        "technician_ids": list(seed.technician_ids),
        "split_count": len(fetched_split_summary["splits"]),
        "host_final_paid_amount": final_host["final_paid_amount"],
        "host_points_balance": host_points["available_points"],
        "registered_guest_points_balance": guest_points["available_points"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: group split regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: group split regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
