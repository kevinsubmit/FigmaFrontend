"""
End-to-end regression script for appointment service item mutation flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal primary store / foreign store / services / admin
3. Register + login one customer and admin
4. Verify customer cannot read or mutate appointment service items
5. Verify admin GET lazily initializes the primary service item
6. Verify pending / confirmed / completed appointments can mutate service items before settlement
7. Verify primary removal, inactive service, foreign-store service are rejected
8. Verify cancelled and settled appointments can no longer mutate service items

Usage:
  cd backend
  python test_appointment_service_items_regression.py
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
from app.models.appointment_service_item import AppointmentServiceItem
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550271")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ServiceItemsAdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "service_items_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2125550272")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "ServiceItemsCustomerPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "service_items_customer")

PRIMARY_STORE_NAME = os.getenv("STORE_NAME", "Regression Service Items Salon")
PRIMARY_SERVICE_PRICE = float(os.getenv("PRIMARY_SERVICE_PRICE", "60"))
ADDON_ONE_AMOUNT = float(os.getenv("ADDON_ONE_AMOUNT", "25"))
ADDON_TWO_AMOUNT = float(os.getenv("ADDON_TWO_AMOUNT", "15"))

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
    primary_service_id: int
    addon_one_service_id: int
    addon_two_service_id: int
    inactive_service_id: int
    foreign_service_id: int


def log(message: str) -> None:
    print(message, flush=True)


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_close(actual: Any, expected: float, label: str, tolerance: float = 1e-6) -> None:
    if abs(float(actual) - float(expected)) > tolerance:
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
    log("[STEP] Seed minimal stores / services / admin")
    db: Session = SessionLocal()
    try:
        primary_store = Store(
            name=PRIMARY_STORE_NAME,
            address="515 Service Items Ave",
            city="New York",
            state="NY",
            zip_code="10014",
            phone=normalize_phone(ADMIN_PHONE),
            email="service-items@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression service items store",
        )
        foreign_store = Store(
            name="Foreign Service Items Store",
            address="616 Foreign Ave",
            city="Brooklyn",
            state="NY",
            zip_code="11211",
            phone="12125550273",
            email="foreign-service-items@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Foreign service rejection store",
        )
        db.add_all([primary_store, foreign_store])
        db.flush()

        for day in range(7):
            db.add(StoreHours(store_id=primary_store.id, day_of_week=day, open_time=time(9, 0), close_time=time(19, 0), is_closed=False))
            db.add(StoreHours(store_id=foreign_store.id, day_of_week=day, open_time=time(9, 0), close_time=time(19, 0), is_closed=False))

        primary_service = Service(
            store_id=primary_store.id,
            name="Primary Service Item",
            description="Primary appointment service item",
            price=PRIMARY_SERVICE_PRICE,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=60,
            category="Nails",
            is_active=1,
        )
        addon_one = Service(
            store_id=primary_store.id,
            name="Add-on Service One",
            description="First add-on appointment service item",
            price=ADDON_ONE_AMOUNT,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=20,
            category="Nails",
            is_active=1,
        )
        addon_two = Service(
            store_id=primary_store.id,
            name="Add-on Service Two",
            description="Second add-on appointment service item",
            price=ADDON_TWO_AMOUNT,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=15,
            category="Nails",
            is_active=1,
        )
        inactive_service = Service(
            store_id=primary_store.id,
            name="Inactive Service Item",
            description="Inactive service should be rejected",
            price=18.0,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=15,
            category="Nails",
            is_active=0,
        )
        foreign_service = Service(
            store_id=foreign_store.id,
            name="Foreign Store Service Item",
            description="Service from another store should be rejected",
            price=19.0,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=15,
            category="Nails",
            is_active=1,
        )
        db.add_all([primary_service, addon_one, addon_two, inactive_service, foreign_service])
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Appointment Service Items Admin",
            email="service-items-admin@example.com",
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
        db.refresh(primary_service)
        db.refresh(addon_one)
        db.refresh(addon_two)
        db.refresh(inactive_service)
        db.refresh(foreign_service)
        return SeedResult(
            admin_user_id=int(admin.id),
            primary_store_id=int(primary_store.id),
            foreign_store_id=int(foreign_store.id),
            primary_service_id=int(primary_service.id),
            addon_one_service_id=int(addon_one.id),
            addon_two_service_id=int(addon_two.id),
            inactive_service_id=int(inactive_service.id),
            foreign_service_id=int(foreign_service.id),
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
            "full_name": "Appointment Service Items Customer",
            "email": "service-items-customer@example.com",
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


def create_appointment(
    customer_token: str,
    seed: SeedResult,
    *,
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
            "store_id": seed.primary_store_id,
            "service_id": seed.primary_service_id,
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


def fetch_service_items(appointment_id: int) -> list[AppointmentServiceItem]:
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(AppointmentServiceItem)
            .filter(AppointmentServiceItem.appointment_id == int(appointment_id))
            .order_by(AppointmentServiceItem.id.asc())
            .all()
        )
        for row in rows:
            db.expunge(row)
        return rows
    finally:
        db.close()


def find_item(summary: Dict[str, Any], *, service_id: int) -> Dict[str, Any]:
    for item in summary["items"]:
        if int(item["service_id"]) == int(service_id):
            return item
    raise AssertionError(f"service item not found in summary: {service_id}")


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_payload = register_customer()
    customer_user_id = int(customer_payload["id"])

    log("[STEP] Login admin and customer")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    appointment_date = (date.today() + timedelta(days=1)).isoformat()

    log("[STEP] Create primary appointment and verify customer is forbidden")
    appointment_a = create_appointment(
        customer_token,
        seed,
        appointment_date=appointment_date,
        appointment_time="10:00:00",
        notes="appointment service items regression flow",
    )
    appointment_a_id = int(appointment_a["id"])

    customer_get_forbidden = request_json(
        "GET",
        f"/appointments/{appointment_a_id}/services",
        token=customer_token,
        expected_statuses=(403,),
    )
    assert_equal(customer_get_forbidden["detail"], "Only store administrators can operate appointments", "customer get service items forbidden")

    log("[STEP] Admin GET initializes primary service item")
    initial_summary = request_json(
        "GET",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_close(initial_summary["order_amount"], PRIMARY_SERVICE_PRICE, "initial order amount")
    assert_equal(len(initial_summary["items"]), 1, "initial service item count")
    primary_item = initial_summary["items"][0]
    assert_equal(int(primary_item["service_id"]), seed.primary_service_id, "initial primary service id")
    assert_equal(bool(primary_item["is_primary"]), True, "initial item primary flag")
    assert_close(primary_item["amount"], PRIMARY_SERVICE_PRICE, "initial primary amount")

    initial_db_items = fetch_service_items(appointment_a_id)
    assert_equal(len(initial_db_items), 1, "initial db item count")
    assert_equal(bool(initial_db_items[0].is_primary), True, "initial db primary flag")

    log("[STEP] Add and validate pending service item mutations")
    pending_added = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(200,),
        json={"service_id": seed.addon_one_service_id, "amount": ADDON_ONE_AMOUNT},
    )
    assert_equal(len(pending_added["items"]), 2, "pending item count after add")
    assert_close(pending_added["order_amount"], PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT, "pending total after add-on one")
    addon_one_item = find_item(pending_added, service_id=seed.addon_one_service_id)
    assert_equal(bool(addon_one_item["is_primary"]), False, "add-on one is non-primary")

    inactive_rejected = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(400,),
        json={"service_id": seed.inactive_service_id, "amount": 18},
    )
    assert_equal(inactive_rejected["detail"], "Service is not active", "inactive service add rejected")

    foreign_rejected = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(400,),
        json={"service_id": seed.foreign_service_id, "amount": 19},
    )
    assert_equal(foreign_rejected["detail"], "Service does not belong to this store", "foreign store service add rejected")

    primary_delete_rejected = request_json(
        "DELETE",
        f"/appointments/{appointment_a_id}/services/{primary_item['id']}",
        token=admin_token,
        expected_statuses=(400,),
    )
    assert_equal(primary_delete_rejected["detail"], "Primary service cannot be removed", "primary service removal rejected")

    log("[STEP] Confirm appointment and continue mutating services")
    confirmed = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed["status"], "confirmed", "appointment A confirmed status")

    confirmed_added = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(200,),
        json={"service_id": seed.addon_two_service_id, "amount": ADDON_TWO_AMOUNT},
    )
    assert_equal(len(confirmed_added["items"]), 3, "confirmed item count after add")
    assert_close(
        confirmed_added["order_amount"],
        PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT + ADDON_TWO_AMOUNT,
        "confirmed total after add-on two",
    )
    addon_two_item = find_item(confirmed_added, service_id=seed.addon_two_service_id)

    completed = request_json(
        "PATCH",
        f"/appointments/{appointment_a_id}/complete",
        token=admin_token,
        expected_statuses=(200,),
        json={},
    )
    assert_equal(completed["status"], "completed", "appointment A completed status")

    completed_deleted = request_json(
        "DELETE",
        f"/appointments/{appointment_a_id}/services/{addon_two_item['id']}",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(len(completed_deleted["items"]), 2, "completed item count after delete")
    assert_close(completed_deleted["order_amount"], PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT, "completed total after delete")

    appointment_a_row = fetch_appointment_row(appointment_a_id)
    assert_equal(status_value(appointment_a_row.status), "completed", "appointment A db status")
    assert_close(appointment_a_row.order_amount, PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT, "appointment A db order amount")
    remaining_items = fetch_service_items(appointment_a_id)
    assert_equal(len(remaining_items), 2, "appointment A db remaining item count")

    log("[STEP] Settle appointment and verify post-settlement guards")
    settled = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/settle",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "idempotency_key": "service-items-settle-001",
            "original_amount": PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT,
            "cash_paid_amount": PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT,
        },
    )
    assert_equal(settled["settlement_status"], "settled", "appointment A settlement status")
    assert_close(settled["final_paid_amount"], PRIMARY_SERVICE_PRICE + ADDON_ONE_AMOUNT, "appointment A final paid amount")

    settled_add_rejected = request_json(
        "POST",
        f"/appointments/{appointment_a_id}/services",
        token=admin_token,
        expected_statuses=(400,),
        json={"service_id": seed.addon_two_service_id, "amount": ADDON_TWO_AMOUNT},
    )
    assert_equal(settled_add_rejected["detail"], "Cannot modify services after settlement", "settled add guard")

    settled_delete_rejected = request_json(
        "DELETE",
        f"/appointments/{appointment_a_id}/services/{addon_one_item['id']}",
        token=admin_token,
        expected_statuses=(400,),
    )
    assert_equal(settled_delete_rejected["detail"], "Cannot modify services after settlement", "settled delete guard")

    log("[STEP] Create cancelled appointment and verify cancelled guards")
    appointment_b = create_appointment(
        customer_token,
        seed,
        appointment_date=(date.today() + timedelta(days=2)).isoformat(),
        appointment_time="11:30:00",
        notes="cancelled appointment service item guards",
    )
    appointment_b_id = int(appointment_b["id"])

    cancelled_initial = request_json(
        "GET",
        f"/appointments/{appointment_b_id}/services",
        token=admin_token,
        expected_statuses=(200,),
    )
    cancelled_primary_item = cancelled_initial["items"][0]

    cancelled = request_json(
        "POST",
        f"/appointments/{appointment_b_id}/cancel",
        token=customer_token,
        expected_statuses=(200,),
        json={"cancel_reason": "Customer changed plan"},
    )
    assert_equal(cancelled["status"], "cancelled", "appointment B cancelled status")

    cancelled_add_rejected = request_json(
        "POST",
        f"/appointments/{appointment_b_id}/services",
        token=admin_token,
        expected_statuses=(400,),
        json={"service_id": seed.addon_one_service_id, "amount": ADDON_ONE_AMOUNT},
    )
    assert_equal(cancelled_add_rejected["detail"], "Cannot add service to cancelled appointment", "cancelled add guard")

    cancelled_delete_rejected = request_json(
        "DELETE",
        f"/appointments/{appointment_b_id}/services/{cancelled_primary_item['id']}",
        token=admin_token,
        expected_statuses=(400,),
    )
    assert_equal(cancelled_delete_rejected["detail"], "Cannot modify services on cancelled appointment", "cancelled delete guard")

    appointment_b_row = fetch_appointment_row(appointment_b_id)
    assert_equal(status_value(appointment_b_row.status), "cancelled", "appointment B db status")
    assert_close(appointment_b_row.order_amount, PRIMARY_SERVICE_PRICE, "appointment B db order amount")

    summary = {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "appointment_settled_id": appointment_a_id,
        "appointment_cancelled_id": appointment_b_id,
        "primary_service_id": seed.primary_service_id,
        "addon_one_service_id": seed.addon_one_service_id,
        "addon_two_service_id": seed.addon_two_service_id,
        "final_settled_order_amount": completed_deleted["order_amount"],
        "settled_item_count": len(completed_deleted["items"]),
    }
    print("OK: appointment service items regression passed")
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
        log(f"FAIL: appointment service items regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
