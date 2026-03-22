"""
End-to-end regression script for appointment technician reassignment flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal store/service/two active technicians/one inactive technician/one foreign-store technician/admin
3. Register + login one customer and admin
4. Customer creates appointment
5. Verify customer cannot reassign technician
6. Verify admin can bind/rebind on pending/confirmed/completed appointments
7. Verify inactive technician and foreign-store technician are rejected
8. Verify cancelled appointments can no longer be rebound

Usage:
  cd backend
  python test_technician_reassignment_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any, Dict, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.appointment import Appointment as AppointmentModel
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.technician import Technician
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550218")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "TechReassignAdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "tech_reassign_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663671")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "TechReassignCustomerPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "tech_reassign_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Technician Reassign Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Technician Reassign Service")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "74"))

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
    "home_feed_theme_settings",
    "notifications",
    "pin_favorites",
    "pin_tags",
    "pins",
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
    "tags",
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
    primary_store_id: int
    foreign_store_id: int
    service_id: int
    tech_a_id: int
    tech_b_id: int
    tech_inactive_id: int
    foreign_tech_id: int


def log(message: str) -> None:
    print(message, flush=True)


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def status_value(value: Any) -> Any:
    return getattr(value, "value", value)


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return f"1{digits}"
    return digits


def request_json(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    expected_statuses: Tuple[int, ...] = (200,),
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
    log("[STEP] Seed minimal stores / service / technicians / admin")
    db: Session = SessionLocal()
    try:
        primary_store = Store(
            name=STORE_NAME,
            address="909 Reassign Ave",
            city="New York",
            state="NY",
            zip_code="10013",
            phone=normalize_phone(ADMIN_PHONE),
            email="tech-reassign@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression technician reassignment store",
        )
        foreign_store = Store(
            name="Foreign Technician Store",
            address="707 Other Ave",
            city="Brooklyn",
            state="NY",
            zip_code="11222",
            phone="12125550219",
            email="foreign-tech@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Foreign store for technician reassignment rejection",
        )
        db.add_all([primary_store, foreign_store])
        db.flush()

        for day in range(7):
            db.add(StoreHours(store_id=primary_store.id, day_of_week=day, open_time=time(9, 0), close_time=time(19, 0), is_closed=False))
            db.add(StoreHours(store_id=foreign_store.id, day_of_week=day, open_time=time(9, 0), close_time=time(19, 0), is_closed=False))

        service = Service(
            store_id=primary_store.id,
            name=SERVICE_NAME,
            description="Regression technician reassignment service",
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

        tech_a = Technician(
            store_id=primary_store.id,
            name="Tech Reassign A",
            phone="12125550220",
            email="tech-a@example.com",
            is_active=1,
        )
        tech_b = Technician(
            store_id=primary_store.id,
            name="Tech Reassign B",
            phone="12125550221",
            email="tech-b@example.com",
            is_active=1,
        )
        tech_inactive = Technician(
            store_id=primary_store.id,
            name="Tech Reassign Inactive",
            phone="12125550222",
            email="tech-inactive@example.com",
            is_active=0,
        )
        foreign_tech = Technician(
            store_id=foreign_store.id,
            name="Tech Foreign Store",
            phone="12125550223",
            email="tech-foreign@example.com",
            is_active=1,
        )
        db.add_all([tech_a, tech_b, tech_inactive, foreign_tech])
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Technician Reassignment Admin",
            email="tech-reassign-admin@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=True,
            store_id=primary_store.id,
            store_admin_status="approved",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.refresh(primary_store)
        db.refresh(foreign_store)
        db.refresh(service)
        db.refresh(tech_a)
        db.refresh(tech_b)
        db.refresh(tech_inactive)
        db.refresh(foreign_tech)
        return SeedResult(
            admin_user_id=int(admin.id),
            primary_store_id=int(primary_store.id),
            foreign_store_id=int(foreign_store.id),
            service_id=int(service.id),
            tech_a_id=int(tech_a.id),
            tech_b_id=int(tech_b.id),
            tech_inactive_id=int(tech_inactive.id),
            foreign_tech_id=int(foreign_tech.id),
        )
    finally:
        db.close()


def register_customer() -> Dict[str, Any]:
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
    assert_equal(verify["valid"], True, "customer verification valid")
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": CUSTOMER_PHONE,
            "username": CUSTOMER_USERNAME,
            "full_name": "Technician Reassignment Customer",
            "email": "tech-reassign-customer@example.com",
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


def create_appointment(customer_token: str, seed: SeedResult, *, appointment_date: str, appointment_time: str, notes: str) -> Dict[str, Any]:
    return request_json(
        "POST",
        "/appointments/",
        token=customer_token,
        expected_statuses=(200, 201),
        json={
            "store_id": seed.primary_store_id,
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


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_payload = register_customer()
    customer_user_id = int(customer_payload["id"])

    log("[STEP] Login admin and customer")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    appointment_date = (date.today() + timedelta(days=1)).isoformat()

    log("[STEP] Create appointment and reject customer-side technician binding")
    appointment_a = create_appointment(customer_token, seed, appointment_date=appointment_date, appointment_time="10:00:00", notes="technician reassignment flow")
    appointment_a_id = int(appointment_a["id"])
    customer_forbidden = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=customer_token,
        expected_statuses=(403,),
        json={"technician_id": seed.tech_a_id},
    )
    assert_equal(customer_forbidden["detail"], "Only store administrators can bind technician", "customer technician bind forbidden")

    log("[STEP] Bind and validate technician changes across appointment lifecycle")
    pending_bound = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(200,),
        json={"technician_id": seed.tech_a_id},
    )
    assert_equal(int(pending_bound["technician_id"]), seed.tech_a_id, "pending technician bind to tech A")

    inactive_rejected = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(400,),
        json={"technician_id": seed.tech_inactive_id},
    )
    assert_equal(inactive_rejected["detail"], "Technician is inactive", "inactive technician rejected")

    foreign_rejected = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(400,),
        json={"technician_id": seed.foreign_tech_id},
    )
    assert_equal(foreign_rejected["detail"], "Technician does not belong to this store", "foreign store technician rejected")

    confirmed = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed["status"], "confirmed", "appointment A confirmed status")

    confirmed_rebound = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(200,),
        json={"technician_id": seed.tech_b_id},
    )
    assert_equal(int(confirmed_rebound["technician_id"]), seed.tech_b_id, "confirmed technician rebound to tech B")

    completed = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/complete",
        token=admin_token,
        expected_statuses=(200,),
        json={},
    )
    assert_equal(completed["status"], "completed", "appointment A completed status")

    completed_rebound = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(200,),
        json={"technician_id": seed.tech_a_id},
    )
    assert_equal(int(completed_rebound["technician_id"]), seed.tech_a_id, "completed technician rebound to tech A")

    completed_unbound = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/technician",
        token=admin_token,
        expected_statuses=(200,),
        json={"technician_id": None},
    )
    assert_equal(completed_unbound["technician_id"], None, "completed appointment unbind technician")

    appointment_a_row = fetch_appointment_row(appointment_a_id)
    assert_equal(status_value(appointment_a_row.status), "completed", "appointment A db status")
    assert_equal(appointment_a_row.technician_id, None, "appointment A db technician after unbind")

    log("[STEP] Cancel a second appointment and verify reassignment guard")
    appointment_b = create_appointment(customer_token, seed, appointment_date=(date.today() + timedelta(days=2)).isoformat(), appointment_time="11:30:00", notes="cancelled technician reassignment guard")
    appointment_b_id = int(appointment_b["id"])
    cancelled = request_json(
        "POST",
        f"/appointments/{appointment_b_id}/cancel",
        token=customer_token,
        expected_statuses=(200,),
        json={"cancel_reason": "Customer changed plan"},
    )
    assert_equal(cancelled["status"], "cancelled", "appointment B cancelled status")

    cancelled_reassign = request_json(
        "PATCH",
        f"/appointments/{appointment_b_id}/technician",
        token=admin_token,
        expected_statuses=(400,),
        json={"technician_id": seed.tech_b_id},
    )
    assert_equal(
        cancelled_reassign["detail"],
        "Only pending, confirmed, or completed appointments can bind technician",
        "cancelled appointment technician guard",
    )

    appointment_b_row = fetch_appointment_row(appointment_b_id)
    assert_equal(status_value(appointment_b_row.status), "cancelled", "appointment B db status")
    assert_equal(appointment_b_row.technician_id, None, "appointment B technician remains null")

    summary = {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "appointment_completed_id": appointment_a_id,
        "appointment_cancelled_id": appointment_b_id,
        "tech_a_id": seed.tech_a_id,
        "tech_b_id": seed.tech_b_id,
        "tech_inactive_id": seed.tech_inactive_id,
        "foreign_tech_id": seed.foreign_tech_id,
        "final_completed_technician_id": completed_unbound["technician_id"],
    }
    print("OK: technician reassignment regression passed")
    print(json.dumps(summary, indent=2))
    return summary


def main() -> int:
    try:
        if CLEANUP_BEFORE:
            cleanup_dynamic_data()
        seed = seed_minimal_data()
        run_api_flow(seed)
        return 0
    except Exception as exc:
        log(f"FAIL: technician reassignment regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
