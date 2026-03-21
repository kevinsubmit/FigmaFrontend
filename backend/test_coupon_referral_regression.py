"""
End-to-end regression script for coupon phone grant + referral reward flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal super admin
3. Register/login referrer
4. Admin creates referral reward coupon template and admin grant coupon template
5. Admin grants coupon to an unregistered phone and verifies pending grant
6. Register/login referee with referrer code
7. Verify pending grant auto-claim and referral reward coupons for both users

Usage:
  cd backend
  python test_coupon_referral_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

SUPER_ADMIN_PHONE = os.getenv("SUPER_ADMIN_PHONE", "2125550217")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "ReferralAdminPass123")
SUPER_ADMIN_USERNAME = os.getenv("SUPER_ADMIN_USERNAME", "coupon_referral_admin")

REFERRER_PHONE = os.getenv("REFERRER_PHONE", "2126663637")
REFERRER_PASSWORD = os.getenv("REFERRER_PASSWORD", "ReferrerPass123")
REFERRER_USERNAME = os.getenv("REFERRER_USERNAME", "coupon_referrer")

REFEREE_PHONE = os.getenv("REFEREE_PHONE", "2126663638")
REFEREE_PASSWORD = os.getenv("REFEREE_PASSWORD", "RefereePass123")
REFEREE_USERNAME = os.getenv("REFEREE_USERNAME", "coupon_referee")

REFERRAL_COUPON_DISCOUNT = float(os.getenv("REFERRAL_COUPON_DISCOUNT", "10"))
PENDING_GRANT_DISCOUNT = float(os.getenv("PENDING_GRANT_DISCOUNT", "12"))

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
    super_admin_user_id: int


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


def masked_phone(phone: str) -> str:
    value = normalize_phone(phone)
    return value[:3] + "****" + value[-4:] if len(value) >= 7 else value


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
    log("[STEP] Seed minimal super admin")
    db: Session = SessionLocal()
    try:
        super_admin = User(
            phone=normalize_phone(SUPER_ADMIN_PHONE),
            password_hash=get_password_hash(SUPER_ADMIN_PASSWORD),
            username=SUPER_ADMIN_USERNAME,
            full_name="Coupon Referral Admin",
            email="coupon-referral-admin@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=True,
            store_id=None,
            store_admin_status=None,
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        return SeedResult(super_admin_user_id=int(super_admin.id))
    finally:
        db.close()


def send_register_code(phone: str) -> None:
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


def register_user(
    *,
    phone: str,
    username: str,
    password: str,
    full_name: str,
    email: str,
    referral_code: Optional[str] = None,
) -> Dict[str, Any]:
    send_register_code(phone)
    payload: Dict[str, Any] = {
        "phone": phone,
        "username": username,
        "full_name": full_name,
        "email": email,
        "password": password,
        "verification_code": "123456",
    }
    if referral_code:
        payload["referral_code"] = referral_code
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json=payload,
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


def create_coupon(
    *,
    admin_token: str,
    name: str,
    category: str,
    discount_value: float,
) -> Dict[str, Any]:
    return request_json(
        "POST",
        "/coupons/create",
        token=admin_token,
        expected_statuses=(200,),
        json={
            "name": name,
            "description": f"{name} regression coupon",
            "type": "fixed_amount",
            "category": category,
            "discount_value": discount_value,
            "min_amount": 0,
            "max_discount": None,
            "valid_days": 30,
            "is_active": True,
            "total_quantity": None,
            "points_required": None,
        },
    )


def find_user_coupon_by_coupon_id(items: List[Dict[str, Any]], coupon_id: int) -> Dict[str, Any]:
    for item in items:
        if int(item["coupon_id"]) == coupon_id:
            return item
    raise AssertionError(f"user coupon for coupon_id={coupon_id} not found")


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    log("[STEP] Register referrer and login")
    referrer_user = register_user(
        phone=REFERRER_PHONE,
        username=REFERRER_USERNAME,
        password=REFERRER_PASSWORD,
        full_name="Referral Referrer",
        email="referrer@example.com",
    )
    referrer_user_id = int(referrer_user["id"])

    admin_token = login(SUPER_ADMIN_PHONE, SUPER_ADMIN_PASSWORD, "admin")
    referrer_token = login(REFERRER_PHONE, REFERRER_PASSWORD, "frontend")

    my_code = request_json("GET", "/referrals/my-code", token=referrer_token, expected_statuses=(200,))
    referral_code = str(my_code["referral_code"])
    assert_true(len(referral_code) >= 6, "referral code generated")

    log("[STEP] Admin creates referral and pending-grant coupon templates")
    referral_coupon = create_coupon(
        admin_token=admin_token,
        name="Regression Referral $10 Off",
        category="referral",
        discount_value=REFERRAL_COUPON_DISCOUNT,
    )
    referral_coupon_id = int(referral_coupon["id"])

    pending_coupon = create_coupon(
        admin_token=admin_token,
        name="Regression Pending Claim $12 Off",
        category="activity",
        discount_value=PENDING_GRANT_DISCOUNT,
    )
    pending_coupon_id = int(pending_coupon["id"])

    log("[STEP] Admin grants coupon to unregistered phone")
    grant_result = request_json(
        "POST",
        "/coupons/grant",
        token=admin_token,
        expected_statuses=(200,),
        json={"phone": REFEREE_PHONE, "coupon_id": pending_coupon_id},
    )
    assert_equal(grant_result["status"], "pending_claim", "grant result status")
    pending_grant_id = int(grant_result["pending_grant_id"])

    pending_rows = request_json(
        "GET",
        "/coupons/pending-grants?status=pending&skip=0&limit=20",
        token=admin_token,
        expected_statuses=(200,),
    )
    pending_row = next((item for item in pending_rows if int(item["id"]) == pending_grant_id), None)
    assert_true(pending_row is not None, "pending grant row visible to admin")
    assert_equal(pending_row["phone"], normalize_phone(REFEREE_PHONE), "pending grant normalized phone")
    assert_equal(pending_row["coupon_id"], pending_coupon_id, "pending grant coupon id")

    log("[STEP] Register referee with referrer code")
    referee_user = register_user(
        phone=REFEREE_PHONE,
        username=REFEREE_USERNAME,
        password=REFEREE_PASSWORD,
        full_name="Referral Referee",
        email="referee@example.com",
        referral_code=referral_code,
    )
    referee_user_id = int(referee_user["id"])
    referee_token = login(REFEREE_PHONE, REFEREE_PASSWORD, "frontend")

    log("[STEP] Verify pending grant auto-claim and referral reward state")
    claimed_rows = request_json(
        "GET",
        "/coupons/pending-grants?status=claimed&skip=0&limit=20",
        token=admin_token,
        expected_statuses=(200,),
    )
    claimed_row = next((item for item in claimed_rows if int(item["id"]) == pending_grant_id), None)
    assert_true(claimed_row is not None, "claimed pending grant row visible to admin")
    assert_equal(claimed_row["claimed_user_id"], referee_user_id, "claimed grant user id")
    assert_true(claimed_row["user_coupon_id"] is not None, "claimed grant user coupon id set")

    referrer_coupons = request_json("GET", "/coupons/my-coupons", token=referrer_token, expected_statuses=(200,))
    referee_coupons = request_json("GET", "/coupons/my-coupons", token=referee_token, expected_statuses=(200,))

    referrer_referral_coupon = find_user_coupon_by_coupon_id(referrer_coupons, referral_coupon_id)
    referee_referral_coupon = find_user_coupon_by_coupon_id(referee_coupons, referral_coupon_id)
    referee_pending_coupon = find_user_coupon_by_coupon_id(referee_coupons, pending_coupon_id)

    assert_equal(referrer_referral_coupon["status"], "available", "referrer referral coupon status")
    assert_equal(referee_referral_coupon["status"], "available", "referee referral coupon status")
    assert_equal(referee_pending_coupon["status"], "available", "referee pending grant coupon status")
    assert_equal(referrer_referral_coupon["source"], "system", "referrer referral coupon source")
    assert_equal(referee_referral_coupon["source"], "system", "referee referral coupon source")
    assert_equal(referee_pending_coupon["source"], "phone_pending", "referee pending coupon source")

    referral_stats = request_json("GET", "/referrals/stats", token=referrer_token, expected_statuses=(200,))
    assert_equal(referral_stats["total_referrals"], 1, "referral total count")
    assert_equal(referral_stats["successful_referrals"], 1, "referral successful count")
    assert_equal(referral_stats["pending_referrals"], 0, "referral pending count")
    assert_equal(referral_stats["total_rewards_earned"], 1, "referral rewards earned count")

    referral_list = request_json("GET", "/referrals/list?skip=0&limit=20", token=referrer_token, expected_statuses=(200,))
    assert_equal(len(referral_list), 1, "referral list length")
    referral_entry = referral_list[0]
    assert_equal(referral_entry["status"], "rewarded", "referral entry status")
    assert_equal(referral_entry["referee_name"], "Referral Referee", "referral entry referee name")
    assert_equal(referral_entry["referee_phone"], masked_phone(REFEREE_PHONE), "referral entry masked phone")
    assert_equal(referral_entry["referrer_reward_given"], True, "referral reward flag")

    pending_rows_after = request_json(
        "GET",
        "/coupons/pending-grants?status=pending&skip=0&limit=20",
        token=admin_token,
        expected_statuses=(200,),
    )
    assert_true(all(int(item["id"]) != pending_grant_id for item in pending_rows_after), "pending grant removed from pending list")

    return {
        "super_admin_user_id": seed.super_admin_user_id,
        "referrer_user_id": referrer_user_id,
        "referee_user_id": referee_user_id,
        "referral_code": referral_code,
        "referral_coupon_id": referral_coupon_id,
        "pending_coupon_id": pending_coupon_id,
        "pending_grant_id": pending_grant_id,
        "claimed_user_coupon_id": int(claimed_row["user_coupon_id"]),
        "referrer_coupon_count": len(referrer_coupons),
        "referee_coupon_count": len(referee_coupons),
        "referral_status": referral_entry["status"],
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: coupon referral regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: coupon referral regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
