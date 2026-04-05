"""
End-to-end regression script for device token + admin push flows.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal super admin/store/service
3. Register/login customer and super admin
4. Customer registers push device token and verifies normalization/upsert
5. Customer creates appointment so store-based batch targeting has a real recipient
6. Super admin sends test push, single push, and store-based batch push
7. Customer disables notifications and verifies all tokens deactivate
8. Customer re-enables notifications, registers a second token, then unregisters it

Usage:
  cd backend
  python test_device_push_admin_regression.py
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
from app.models.push_device_token import PushDeviceToken
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

SUPER_ADMIN_PHONE = os.getenv("SUPER_ADMIN_PHONE", "2125550197")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdminPass123")
SUPER_ADMIN_USERNAME = os.getenv("SUPER_ADMIN_USERNAME", "push_super_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663616")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "PushCustomerPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "push_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Push Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Push Token Service")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "55"))

PRIMARY_DEVICE_TOKEN_INPUT = os.getenv(
    "PRIMARY_DEVICE_TOKEN_INPUT",
    "<AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA AA>",
)
PRIMARY_DEVICE_TOKEN_NORMALIZED = "aa" * 32
SECONDARY_DEVICE_TOKEN_INPUT = os.getenv("SECONDARY_DEVICE_TOKEN_INPUT", "bb" * 32)
SECONDARY_DEVICE_TOKEN_NORMALIZED = "bb" * 32

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
    super_admin_user_id: int
    store_id: int
    service_id: int


def log(message: str) -> None:
    print(message, flush=True)


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
    log("[STEP] Seed minimal super admin/store/service")
    db: Session = SessionLocal()
    try:
        store = Store(
            name=STORE_NAME,
            address="159 Push Ave",
            city="New York",
            state="NY",
            zip_code="10006",
            phone=normalize_phone(SUPER_ADMIN_PHONE),
            email="push@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression device token and admin push test store",
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
            description="Regression device push test service",
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

        super_admin = User(
            phone=normalize_phone(SUPER_ADMIN_PHONE),
            password_hash=get_password_hash(SUPER_ADMIN_PASSWORD),
            username=SUPER_ADMIN_USERNAME,
            full_name="Push Super Admin",
            email="push-super-admin@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=True,
            store_id=None,
            store_admin_status=None,
        )
        db.add(super_admin)
        db.commit()
        db.refresh(store)
        db.refresh(service)
        db.refresh(super_admin)
        return SeedResult(
            super_admin_user_id=int(super_admin.id),
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
    verify_payload = request_json(
        "POST",
        "/auth/verify-code",
        expected_statuses=(200,),
        json={"phone": CUSTOMER_PHONE, "code": "123456", "purpose": "register"},
    )
    assert_equal(verify_payload.get("valid"), True, "customer phone verification should succeed")
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD,
            "username": CUSTOMER_USERNAME,
            "full_name": "Push Customer",
            "email": "push-customer@example.com",
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
    assert_true(bool(token), f"login token missing for {phone}")
    return str(token)


def get_active_tokens(user_id: int) -> List[PushDeviceToken]:
    db: Session = SessionLocal()
    try:
        return (
            db.query(PushDeviceToken)
            .filter(PushDeviceToken.user_id == int(user_id), PushDeviceToken.is_active == True)
            .order_by(PushDeviceToken.id.asc())
            .all()
        )
    finally:
        db.close()


def get_all_tokens(user_id: int) -> List[PushDeviceToken]:
    db: Session = SessionLocal()
    try:
        return (
            db.query(PushDeviceToken)
            .filter(PushDeviceToken.user_id == int(user_id))
            .order_by(PushDeviceToken.id.asc())
            .all()
        )
    finally:
        db.close()


def create_appointment(token: str, seed: SeedResult) -> Dict[str, Any]:
    appointment_date = (date.today() + timedelta(days=1)).isoformat()
    payload = request_json(
        "POST",
        "/appointments/",
        token=token,
        expected_statuses=(200,),
        json={
            "store_id": seed.store_id,
            "service_id": seed.service_id,
            "appointment_date": appointment_date,
            "appointment_time": "14:00:00",
            "notes": "Device push regression appointment",
        },
    )
    assert_equal(payload.get("status"), "pending", "created appointment status")
    return payload


def main() -> None:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    seed = seed_minimal_data()
    customer = register_customer()
    customer_id = int(customer["id"])

    log("[STEP] Login super admin and customer")
    super_admin_token = login(SUPER_ADMIN_PHONE, SUPER_ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    log("[STEP] Register device token and validate normalization/upsert")
    register_one = request_json(
        "POST",
        "/notifications/devices/register",
        token=customer_token,
        expected_statuses=(200,),
        json={
            "device_token": PRIMARY_DEVICE_TOKEN_INPUT,
            "platform": "ios",
            "apns_environment": "sandbox",
            "app_version": "1.0.0",
            "device_name": "iPhone 15 Pro",
            "locale": "en-US",
            "timezone": "America/New_York",
        },
    )
    assert_equal(register_one.get("detail"), "Push device token registered", "register detail")
    register_two = request_json(
        "POST",
        "/notifications/devices/register",
        token=customer_token,
        expected_statuses=(200,),
        json={
            "device_token": PRIMARY_DEVICE_TOKEN_INPUT,
            "platform": "ios",
            "apns_environment": "production",
            "app_version": "1.1.0",
            "device_name": "iPhone 15 Pro Max",
            "locale": "en-US",
            "timezone": "America/Los_Angeles",
        },
    )
    assert_equal(register_two.get("device_id"), register_one.get("device_id"), "upsert should reuse device row")

    active_tokens = get_active_tokens(customer_id)
    assert_equal(len(active_tokens), 1, "active token count after upsert")
    primary_token = active_tokens[0]
    assert_equal(primary_token.device_token, PRIMARY_DEVICE_TOKEN_NORMALIZED, "normalized primary token")
    assert_equal(primary_token.apns_environment, "production", "upsert apns_environment")
    assert_equal(primary_token.app_version, "1.1.0", "upsert app_version")
    assert_equal(primary_token.device_name, "iPhone 15 Pro Max", "upsert device_name")
    assert_equal(primary_token.timezone, "America/Los_Angeles", "upsert timezone")

    preferences = request_json(
        "GET",
        "/notifications/preferences",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(preferences.get("push_enabled"), True, "initial push preferences")
    settings_preferences = request_json(
        "GET",
        "/notifications/settings/preferences",
        token=customer_token,
        expected_statuses=(200,),
    )
    assert_equal(settings_preferences.get("push_enabled"), True, "settings push preferences")

    log("[STEP] Create appointment so store-based batch push has a target")
    appointment = create_appointment(customer_token, seed)
    appointment_id = int(appointment["id"])

    log("[STEP] Send admin test push, single push, and store batch push")
    test_push = request_json(
        "POST",
        "/notifications/admin/test-push",
        token=super_admin_token,
        expected_statuses=(200,),
        json={
            "title": "Smoke Test Push",
            "message": "Testing admin test push endpoint.",
            "user_id": customer_id,
        },
    )
    assert_equal(test_push.get("detail"), "Test push sent", "test push detail")
    assert_equal(int(test_push.get("target_user_id")), customer_id, "test push target_user_id")

    single_push = request_json(
        "POST",
        "/notifications/admin/send",
        token=super_admin_token,
        expected_statuses=(200,),
        json={
            "user_id": customer_id,
            "title": "Smoke Single Push",
            "message": "Testing admin single push endpoint.",
            "custom_data": {"source": "device-push-smoke"},
        },
    )
    assert_equal(single_push.get("detail"), "Push sent", "single push detail")
    assert_equal(int(single_push.get("target_user_id")), customer_id, "single push target_user_id")
    assert_true(int(single_push.get("sent", 0)) >= 0, "single push sent should be non-negative")
    assert_true(int(single_push.get("failed", 0)) >= 0, "single push failed should be non-negative")
    assert_true(int(single_push.get("deactivated", 0)) >= 0, "single push deactivated should be non-negative")

    batch_push = request_json(
        "POST",
        "/notifications/admin/send-batch",
        token=super_admin_token,
        expected_statuses=(200,),
        json={
            "store_id": seed.store_id,
            "title": "Smoke Batch Push",
            "message": "Testing admin batch push endpoint.",
            "custom_data": {"source": "device-push-batch-smoke"},
        },
    )
    assert_equal(batch_push.get("detail"), "Batch push processed", "batch push detail")
    assert_equal(int(batch_push.get("target_user_count")), 1, "batch push target_user_count")
    assert_equal(bool(batch_push.get("truncated")), False, "batch push truncated")
    batch_user_total = (
        int(batch_push.get("sent_user_count", 0))
        + int(batch_push.get("failed_user_count", 0))
        + int(batch_push.get("skipped_user_count", 0))
    )
    assert_equal(batch_user_total, 1, "batch push accounted user count")

    log("[STEP] Disable notifications and verify all tokens deactivate")
    disabled_preferences = request_json(
        "PUT",
        "/notifications/preferences",
        token=customer_token,
        expected_statuses=(200,),
        json={"push_enabled": False},
    )
    assert_equal(disabled_preferences.get("push_enabled"), False, "disabled push preferences")
    after_disable_tokens = get_all_tokens(customer_id)
    assert_equal(len(after_disable_tokens), 1, "token rows after disable")
    assert_true(all(not bool(token.is_active) for token in after_disable_tokens), "all tokens should be inactive after disable")

    log("[STEP] Re-enable notifications, register second token, then unregister it")
    enabled_preferences = request_json(
        "PUT",
        "/notifications/settings/preferences",
        token=customer_token,
        expected_statuses=(200,),
        json={"push_enabled": True},
    )
    assert_equal(enabled_preferences.get("push_enabled"), True, "enabled push preferences")

    second_register = request_json(
        "POST",
        "/notifications/devices/register",
        token=customer_token,
        expected_statuses=(200,),
        json={
            "device_token": SECONDARY_DEVICE_TOKEN_INPUT,
            "platform": "ios",
            "apns_environment": "sandbox",
            "app_version": "2.0.0",
            "device_name": "iPhone SE",
            "locale": "en-US",
            "timezone": "America/New_York",
        },
    )
    second_token_id = int(second_register["device_id"])
    active_tokens_after_reenable = get_active_tokens(customer_id)
    assert_equal(len(active_tokens_after_reenable), 1, "active token count after re-enable")
    assert_equal(active_tokens_after_reenable[0].id, second_token_id, "second token should be the only active one")
    assert_equal(active_tokens_after_reenable[0].device_token, SECONDARY_DEVICE_TOKEN_NORMALIZED, "normalized secondary token")

    unregister_payload = request_json(
        "POST",
        "/notifications/devices/unregister",
        token=customer_token,
        expected_statuses=(200,),
        json={"device_token": SECONDARY_DEVICE_TOKEN_INPUT},
    )
    assert_equal(bool(unregister_payload.get("deactivated")), True, "unregister should deactivate token")
    all_tokens_after_unregister = get_all_tokens(customer_id)
    assert_equal(len(all_tokens_after_unregister), 2, "token rows after unregister")
    assert_true(all(not bool(token.is_active) for token in all_tokens_after_unregister), "all tokens should be inactive after unregister")

    summary = {
        "super_admin_user_id": seed.super_admin_user_id,
        "customer_user_id": customer_id,
        "appointment_id": appointment_id,
        "primary_device_id": int(register_one["device_id"]),
        "secondary_device_id": second_token_id,
        "batch_target_user_count": int(batch_push["target_user_count"]),
        "batch_skipped_user_count": int(batch_push["skipped_user_count"]),
    }
    print("OK: device token + admin push regression passed")
    print(json.dumps(summary, indent=2))

    if CLEANUP_AFTER:
        cleanup_dynamic_data()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
