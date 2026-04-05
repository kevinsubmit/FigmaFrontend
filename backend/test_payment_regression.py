"""
End-to-end regression script for payment settlement and refund flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/service
3. Customer register/login
4. Admin login
5. Coupon create + claim
6. Gift card purchase
7. Appointment create + confirm
8. Settle with coupon + gift card + cash split
9. Partial refund
10. Full refund
11. Validate points / coupon / gift card rollback

Usage:
  cd backend
  python test_payment_regression.py

Optional env vars:
  BASE_URL=http://localhost:8000/api/v1
  CLEANUP_BEFORE=1
  CLEANUP_AFTER=0
  ADMIN_PHONE=2125550198
  ADMIN_PASSWORD=AdminPass123
  CUSTOMER_PHONE=2126663606
  CUSTOMER_PASSWORD=CustomerPass123
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

import urllib.error
import urllib.request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.service import Service
from app.models.store import Store
from app.models.store_hours import StoreHours
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125550198")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "payment_admin")

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663606")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "CustomerPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "pay_customer")

STORE_NAME = os.getenv("STORE_NAME", "Regression Payment Salon")
SERVICE_NAME = os.getenv("SERVICE_NAME", "Structured Gel Set")
SERVICE_PRICE = float(os.getenv("SERVICE_PRICE", "70"))
GIFT_CARD_AMOUNT = float(os.getenv("GIFT_CARD_AMOUNT", "25"))
COUPON_DISCOUNT = float(os.getenv("COUPON_DISCOUNT", "10"))

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
            address="123 Regression Ave",
            city="New York",
            state="NY",
            zip_code="10001",
            phone="12125550198",
            email="payments@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=0.0,
            review_count=0,
            description="Regression payment test store",
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
            description="Regression payment test service",
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
            phone=f"1{''.join(ch for ch in ADMIN_PHONE if ch.isdigit())[-10:]}",
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Payment Admin",
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
            "full_name": "Payment Customer",
            "email": "customer@example.com",
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


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    customer_user = register_customer()
    customer_user_id = int(customer_user["id"])

    log("[STEP] Admin and customer login")
    admin_token = login(ADMIN_PHONE, ADMIN_PASSWORD, "admin")
    customer_token = login(CUSTOMER_PHONE, CUSTOMER_PASSWORD, "frontend")

    log("[STEP] Create coupon and claim coupon")
    coupon = request_json(
        "POST",
        "/coupons/create",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "name": "Regression $10 Off",
            "description": "Regression coupon for settlement flow",
            "type": "fixed_amount",
            "category": "activity",
            "discount_value": COUPON_DISCOUNT,
            "min_amount": 0,
            "max_discount": None,
            "valid_days": 30,
            "is_active": True,
            "total_quantity": None,
            "points_required": None,
        },
    )
    coupon_id = int(coupon["id"])
    user_coupon = request_json(
        "POST",
        "/coupons/claim",
        token=customer_token,
        expected_statuses=(200,),
        json={"coupon_id": coupon_id, "source": "activity"},
    )
    user_coupon_id = int(user_coupon["id"])
    assert_equal(user_coupon["status"], "available", "user coupon initial status")

    log("[STEP] Purchase self gift card")
    gift_purchase = request_json(
        "POST",
        "/gift-cards/purchase",
        token=customer_token,
        expected_statuses=(200,),
        json={"amount": GIFT_CARD_AMOUNT},
    )
    gift_card = gift_purchase["gift_card"]
    gift_card_id = int(gift_card["id"])
    assert_equal(gift_card["status"], "active", "gift card initial status")
    assert_close(gift_card["balance"], GIFT_CARD_AMOUNT, "gift card initial balance")

    log("[STEP] Create and confirm appointment")
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
            "appointment_time": "10:00:00",
            "notes": "payment regression flow",
        },
    )
    appointment_id = int(appointment["id"])
    confirmed = request_json(
        "PATCH",
        f"/appointments/{appointment_id}/confirm",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_equal(confirmed["status"], "confirmed", "appointment confirmed status")

    log("[STEP] Settle appointment with coupon + gift card + cash split")
    settled = request_json(
        "POST",
        f"/appointments/{appointment_id}/settle",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "idempotency_key": "settle-001",
            "original_amount": SERVICE_PRICE,
            "user_coupon_id": user_coupon_id,
            "coupon_discount_amount": COUPON_DISCOUNT,
            "gift_card_id": gift_card_id,
            "gift_card_amount": GIFT_CARD_AMOUNT,
            "cash_paid_amount": SERVICE_PRICE - COUPON_DISCOUNT - GIFT_CARD_AMOUNT,
        },
    )
    assert_equal(settled["settlement_status"], "settled", "settlement status after settle")
    assert_close(settled["coupon_discount_amount"], COUPON_DISCOUNT, "coupon discount after settle")
    assert_close(settled["gift_card_used_amount"], GIFT_CARD_AMOUNT, "gift card used after settle")
    assert_close(
        settled["cash_paid_amount"],
        SERVICE_PRICE - COUPON_DISCOUNT - GIFT_CARD_AMOUNT,
        "cash after settle",
    )
    assert_close(
        settled["final_paid_amount"],
        SERVICE_PRICE - COUPON_DISCOUNT,
        "final paid after settle",
    )

    points_after_settle = request_json("GET", "/points/balance", token=customer_token, expected_statuses=(200,))
    assert_equal(points_after_settle["available_points"], int(SERVICE_PRICE - COUPON_DISCOUNT), "points after settle")
    coupons_after_settle = request_json("GET", "/coupons/my-coupons", token=customer_token, expected_statuses=(200,))
    settled_coupon = next(item for item in coupons_after_settle if item["id"] == user_coupon_id)
    assert_equal(settled_coupon["status"], "used", "coupon status after settle")
    gift_cards_after_settle = request_json("GET", "/gift-cards/my-cards", token=customer_token, expected_statuses=(200,))
    settled_card = next(item for item in gift_cards_after_settle if item["id"] == gift_card_id)
    assert_close(settled_card["balance"], 0, "gift card balance after settle")

    log("[STEP] Partial refund")
    partial_refund = request_json(
        "POST",
        f"/appointments/{appointment_id}/refund",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "idempotency_key": "refund-001",
            "refund_cash_amount": 10,
            "refund_gift_card_amount": 5,
            "gift_card_id": gift_card_id,
            "reason": "partial regression refund",
        },
    )
    assert_equal(
        partial_refund["settlement_status"],
        "partially_refunded",
        "settlement status after partial refund",
    )
    assert_close(partial_refund["cash_paid_amount"], 25, "cash after partial refund")
    assert_close(partial_refund["gift_card_used_amount"], 20, "gift used after partial refund")
    assert_close(partial_refund["final_paid_amount"], 45, "final paid after partial refund")

    points_after_partial = request_json("GET", "/points/balance", token=customer_token, expected_statuses=(200,))
    assert_equal(points_after_partial["available_points"], 45, "points after partial refund")
    gift_cards_after_partial = request_json("GET", "/gift-cards/my-cards", token=customer_token, expected_statuses=(200,))
    partial_card = next(item for item in gift_cards_after_partial if item["id"] == gift_card_id)
    assert_close(partial_card["balance"], 5, "gift card balance after partial refund")
    coupons_after_partial = request_json("GET", "/coupons/my-coupons", token=customer_token, expected_statuses=(200,))
    partial_coupon = next(item for item in coupons_after_partial if item["id"] == user_coupon_id)
    assert_equal(partial_coupon["status"], "used", "coupon status after partial refund")

    log("[STEP] Full refund remaining amount")
    final_refund = request_json(
        "POST",
        f"/appointments/{appointment_id}/refund",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "idempotency_key": "refund-002",
            "refund_cash_amount": 25,
            "refund_gift_card_amount": 20,
            "gift_card_id": gift_card_id,
            "reason": "full regression refund",
        },
    )
    assert_equal(final_refund["settlement_status"], "refunded", "settlement status after full refund")
    assert_close(final_refund["cash_paid_amount"], 0, "cash after full refund")
    assert_close(final_refund["gift_card_used_amount"], 0, "gift used after full refund")
    assert_close(final_refund["final_paid_amount"], 0, "final paid after full refund")

    points_after_full = request_json("GET", "/points/balance", token=customer_token, expected_statuses=(200,))
    assert_equal(points_after_full["available_points"], 0, "points after full refund")
    point_txns = request_json("GET", "/points/transactions?skip=0&limit=20", token=customer_token, expected_statuses=(200,))
    coupons_after_full = request_json("GET", "/coupons/my-coupons", token=customer_token, expected_statuses=(200,))
    final_coupon = next(item for item in coupons_after_full if item["id"] == user_coupon_id)
    assert_equal(final_coupon["status"], "available", "coupon status after full refund")
    gift_cards_after_full = request_json("GET", "/gift-cards/my-cards", token=customer_token, expected_statuses=(200,))
    final_card = next(item for item in gift_cards_after_full if item["id"] == gift_card_id)
    assert_equal(final_card["status"], "active", "gift card status after full refund")
    assert_close(final_card["balance"], GIFT_CARD_AMOUNT, "gift card balance after full refund")
    my_appointments = request_json("GET", "/appointments/?skip=0&limit=10", token=customer_token, expected_statuses=(200,))
    final_appt = next(item for item in my_appointments if item["id"] == appointment_id)
    assert_equal(final_appt["settlement_status"], "refunded", "appointment list settlement status")

    return {
        "admin_user_id": seed.admin_user_id,
        "customer_user_id": customer_user_id,
        "coupon_id": coupon_id,
        "user_coupon_id": user_coupon_id,
        "gift_card_id": gift_card_id,
        "appointment_id": appointment_id,
        "appointment_status": final_appt["status"],
        "appointment_settlement_status": final_appt["settlement_status"],
        "final_points_balance": points_after_full["available_points"],
        "point_transaction_count": len(point_txns),
        "final_coupon_status": final_coupon["status"],
        "final_gift_card_balance": final_card["balance"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: payment regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: payment regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
