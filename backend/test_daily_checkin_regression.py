"""End-to-end regression script for daily check-in points flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed one customer account
3. Login customer
4. Verify initial daily check-in status is unchecked
5. Claim daily check-in once and validate points balance + transaction
6. Retry same-day claim and verify idempotent response

Usage:
  cd backend
  python test_daily_checkin_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.daily_checkin import DailyCheckIn
from app.models.point_transaction import PointTransaction
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2125550310")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "DailyCheckPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "daily_check_customer")

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
    customer_user_id: int


def log(message: str) -> None:
    print(message, flush=True)


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return f"1{digits}"
    return digits


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


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


def seed_customer() -> SeedResult:
    log("[STEP] Seed customer")
    db: Session = SessionLocal()
    try:
        customer = User(
            phone=normalize_phone(CUSTOMER_PHONE),
            password_hash=get_password_hash(CUSTOMER_PASSWORD),
            username=CUSTOMER_USERNAME,
            full_name="Daily Check Customer",
            email="daily-check@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=False,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return SeedResult(customer_user_id=int(customer.id))
    finally:
        db.close()


def login_customer() -> str:
    log("[STEP] Customer login")
    payload = {
        "phone": normalize_phone(CUSTOMER_PHONE),
        "password": CUSTOMER_PASSWORD,
        "login_portal": "frontend",
    }
    response = request_json("POST", "/auth/login", json=payload)
    token = response.get("access_token")
    if not token:
        raise AssertionError("Expected access_token from login response")
    return str(token)


def validate_database_state(user_id: int) -> None:
    log("[STEP] Validate database state")
    db: Session = SessionLocal()
    try:
        checkins = db.query(DailyCheckIn).filter(DailyCheckIn.user_id == user_id).all()
        assert_equal(len(checkins), 1, "daily check-in row count")

        transactions = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.reference_type == "daily_checkin",
                PointTransaction.reference_id == checkins[0].id,
            )
            .all()
        )
        assert_equal(len(transactions), 1, "daily check-in transaction count")
        assert_equal(transactions[0].reason, "Daily check-in", "daily check-in transaction reason")
        assert_equal(transactions[0].amount, 5, "daily check-in transaction amount")
    finally:
        db.close()


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    seed = seed_customer()
    token = login_customer()

    log("[STEP] Verify initial status")
    initial_status = request_json("GET", "/points/daily-checkin/status", token=token)
    assert_equal(initial_status["checked_in_today"], False, "initial checked_in_today")
    assert_equal(initial_status["reward_points"], 5, "daily reward points")

    log("[STEP] Claim daily check-in")
    claim_response = request_json("POST", "/points/daily-checkin", token=token)
    assert_equal(claim_response["checked_in_today"], True, "claim checked_in_today")
    assert_equal(claim_response["awarded_points"], 5, "claim awarded_points")
    assert_equal(claim_response["available_points"], 5, "claim available_points")
    assert_equal(claim_response["total_points"], 5, "claim total_points")

    log("[STEP] Verify status after claim")
    claimed_status = request_json("GET", "/points/daily-checkin/status", token=token)
    assert_equal(claimed_status["checked_in_today"], True, "post-claim checked_in_today")

    log("[STEP] Retry same-day claim")
    retry_response = request_json("POST", "/points/daily-checkin", token=token)
    assert_equal(retry_response["awarded_points"], 0, "retry awarded_points")
    assert_equal(retry_response["available_points"], 5, "retry available_points")
    assert_equal(retry_response["total_points"], 5, "retry total_points")

    log("[STEP] Verify balance + transactions")
    balance = request_json("GET", "/points/balance", token=token)
    assert_equal(balance["available_points"], 5, "points balance")
    transactions = request_json("GET", "/points/transactions?skip=0&limit=20", token=token)
    assert_equal(len(transactions), 1, "transaction count")
    assert_equal(transactions[0]["reason"], "Daily check-in", "transaction reason")
    assert_equal(transactions[0]["reference_type"], "daily_checkin", "transaction reference type")

    validate_database_state(seed.customer_user_id)

    log("OK: daily check-in regression passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()
