"""
End-to-end regression script for backend admin operations flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal admin/store/customers/appointments/rewards/referrals/logs/security data
3. Admin login
4. Verify dashboard summary + realtime notifications
5. Verify customers admin list/detail/tags/appointments/rewards/referrals
6. Verify seeded logs admin list/detail/stats
7. Verify risk list + set-level + restrict + unrestrict
8. Verify security summary + block logs + ip rules + quick block
9. Verify security audit log is queryable from logs admin

Usage:
  cd backend
  python test_admin_ops_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, time as clock_time, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.coupon import Coupon, CouponCategory, CouponType
from app.models.gift_card import GiftCard
from app.models.point_transaction import PointTransaction, TransactionType
from app.models.referral import Referral
from app.models.risk import UserRiskState
from app.models.security import SecurityBlockLog
from app.models.service import Service
from app.models.store import Store
from app.models.system_log import SystemLog
from app.models.user import User
from app.models.user_coupon import CouponStatus, UserCoupon
from app.models.user_points import UserPoints


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"
ET_TZ = ZoneInfo("America/New_York")

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "2125552301")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminOpsPass123")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin_ops_super")

PRIMARY_CUSTOMER_PHONE = os.getenv("PRIMARY_CUSTOMER_PHONE", "2126664101")
PRIMARY_CUSTOMER_USERNAME = os.getenv("PRIMARY_CUSTOMER_USERNAME", "alice_admin_ops")
PRIMARY_CUSTOMER_NAME = os.getenv("PRIMARY_CUSTOMER_NAME", "Alice Admin Ops")

INVITED_CUSTOMER_PHONE = os.getenv("INVITED_CUSTOMER_PHONE", "2126664102")
INVITED_CUSTOMER_USERNAME = os.getenv("INVITED_CUSTOMER_USERNAME", "bob_invited_ops")
INVITED_CUSTOMER_NAME = os.getenv("INVITED_CUSTOMER_NAME", "Bob Invited")

REFERRER_CUSTOMER_PHONE = os.getenv("REFERRER_CUSTOMER_PHONE", "2126664103")
REFERRER_CUSTOMER_USERNAME = os.getenv("REFERRER_CUSTOMER_USERNAME", "charlie_referrer_ops")
REFERRER_CUSTOMER_NAME = os.getenv("REFERRER_CUSTOMER_NAME", "Charlie Referrer")

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
    "security_ip_rules",
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
    store_id: int
    premium_service_id: int
    basic_service_id: int
    primary_customer_id: int
    invited_customer_id: int
    referrer_customer_id: int
    pending_appointment_id: int
    audit_seed_log_id: int


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
    if kwargs:
        raise TypeError(f"Unsupported request_json kwargs: {sorted(kwargs.keys())}")
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
    log("[STEP] Seed admin/store/customers/appointments/rewards/logs/security")
    db: Session = SessionLocal()
    try:
        today_et = datetime.now(ET_TZ).date()
        tomorrow_et = today_et + timedelta(days=1)
        last_week_date = today_et - timedelta(days=7)
        no_show_date = today_et - timedelta(days=2)
        now_utc = datetime.utcnow()

        store = Store(
            name="Admin Ops Regression Salon",
            address="88 Operator Ave",
            city="New York",
            state="NY",
            zip_code="10010",
            phone=normalize_phone(ADMIN_PHONE),
            email="admin-ops@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=4.9,
            review_count=24,
            description="Admin regression smoke store",
        )
        db.add(store)
        db.flush()

        premium_service = Service(
            store_id=store.id,
            name="Admin Premium Gel",
            description="Premium service for dashboard and customer smoke",
            price=90.0,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=75,
            category="Nails",
            is_active=1,
        )
        basic_service = Service(
            store_id=store.id,
            name="Admin Basic Manicure",
            description="Basic service for customer smoke",
            price=60.0,
            commission_amount=0.0,
            commission_type="fixed",
            commission_value=0.0,
            duration_minutes=45,
            category="Nails",
            is_active=1,
        )
        db.add_all([premium_service, basic_service])
        db.flush()

        admin = User(
            phone=normalize_phone(ADMIN_PHONE),
            password_hash=get_password_hash(ADMIN_PASSWORD),
            username=ADMIN_USERNAME,
            full_name="Admin Ops Super",
            email="admin-ops-super@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=True,
            store_id=store.id,
            store_admin_status="approved",
            last_login_at=now_utc,
        )
        primary_customer = User(
            phone=normalize_phone(PRIMARY_CUSTOMER_PHONE),
            password_hash=get_password_hash("unused"),
            username=PRIMARY_CUSTOMER_USERNAME,
            full_name=PRIMARY_CUSTOMER_NAME,
            email="alice-admin-ops@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=False,
            store_id=None,
            customer_tags=json.dumps(["seeded"], ensure_ascii=False),
            referral_code="ALICEOPS1",
            last_login_at=now_utc - timedelta(hours=3),
        )
        invited_customer = User(
            phone=normalize_phone(INVITED_CUSTOMER_PHONE),
            password_hash=get_password_hash("unused"),
            username=INVITED_CUSTOMER_USERNAME,
            full_name=INVITED_CUSTOMER_NAME,
            email="bob-invited@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=False,
            store_id=None,
            last_login_at=now_utc - timedelta(days=1),
        )
        referrer_customer = User(
            phone=normalize_phone(REFERRER_CUSTOMER_PHONE),
            password_hash=get_password_hash("unused"),
            username=REFERRER_CUSTOMER_USERNAME,
            full_name=REFERRER_CUSTOMER_NAME,
            email="charlie-referrer@example.com",
            phone_verified=True,
            is_active=True,
            is_admin=False,
            store_id=None,
            referral_code="CHARLIE1",
            last_login_at=now_utc - timedelta(days=2),
        )
        db.add_all([admin, primary_customer, invited_customer, referrer_customer])
        db.flush()

        completed_today = Appointment(
            order_number="ADM-OPS-COMP-1",
            user_id=primary_customer.id,
            store_id=store.id,
            service_id=premium_service.id,
            appointment_date=today_et,
            appointment_time=clock_time(11, 0),
            order_amount=90.0,
            original_amount=90.0,
            final_paid_amount=90.0,
            cash_paid_amount=90.0,
            paid_amount=90.0,
            payment_status="paid",
            settlement_status="settled",
            status=AppointmentStatus.COMPLETED,
            completed_at=now_utc - timedelta(hours=1),
            created_at=now_utc - timedelta(hours=6),
        )
        completed_last_week = Appointment(
            order_number="ADM-OPS-COMP-2",
            user_id=primary_customer.id,
            store_id=store.id,
            service_id=basic_service.id,
            appointment_date=last_week_date,
            appointment_time=clock_time(12, 0),
            order_amount=60.0,
            original_amount=60.0,
            final_paid_amount=60.0,
            cash_paid_amount=60.0,
            paid_amount=60.0,
            payment_status="paid",
            settlement_status="settled",
            status=AppointmentStatus.COMPLETED,
            completed_at=now_utc - timedelta(days=7),
            created_at=now_utc - timedelta(days=8),
        )
        pending_tomorrow = Appointment(
            order_number="ADM-OPS-PENDING-1",
            user_id=primary_customer.id,
            store_id=store.id,
            service_id=premium_service.id,
            appointment_date=tomorrow_et,
            appointment_time=clock_time(13, 0),
            order_amount=90.0,
            original_amount=90.0,
            status=AppointmentStatus.PENDING,
            settlement_status="unsettled",
            payment_status="unpaid",
            created_at=now_utc - timedelta(minutes=5),
        )
        cancelled_no_show = Appointment(
            order_number="ADM-OPS-NOSHOW-1",
            user_id=primary_customer.id,
            store_id=store.id,
            service_id=basic_service.id,
            appointment_date=no_show_date,
            appointment_time=clock_time(15, 0),
            order_amount=60.0,
            original_amount=60.0,
            status=AppointmentStatus.CANCELLED,
            settlement_status="unsettled",
            payment_status="unpaid",
            cancel_reason="No show",
            cancelled_at=now_utc - timedelta(days=1),
            created_at=now_utc - timedelta(days=2),
        )
        db.add_all([completed_today, completed_last_week, pending_tomorrow, cancelled_no_show])
        db.flush()

        user_points = UserPoints(
            user_id=primary_customer.id,
            total_points=120,
            available_points=80,
        )
        db.add(user_points)
        db.flush()
        db.add_all(
            [
                PointTransaction(
                    user_points_id=user_points.id,
                    amount=120,
                    type=TransactionType.EARN,
                    reason="completed_appointments",
                    description="Seeded earned points",
                    reference_type="appointment",
                    reference_id=completed_today.id,
                ),
                PointTransaction(
                    user_points_id=user_points.id,
                    amount=-40,
                    type=TransactionType.SPEND,
                    reason="coupon_redeem",
                    description="Seeded spent points",
                    reference_type="coupon",
                    reference_id=1,
                ),
            ]
        )

        coupon = Coupon(
            name="Admin Ops Coupon",
            description="Seeded customer rewards coupon",
            type=CouponType.FIXED_AMOUNT,
            category=CouponCategory.ACTIVITY,
            discount_value=15.0,
            min_amount=50.0,
            max_discount=None,
            valid_days=30,
            is_active=True,
            total_quantity=None,
            claimed_quantity=1,
            points_required=None,
        )
        db.add(coupon)
        db.flush()
        db.add(
            UserCoupon(
                user_id=primary_customer.id,
                coupon_id=coupon.id,
                status=CouponStatus.AVAILABLE,
                source="activity",
                expires_at=now_utc + timedelta(days=30),
            )
        )

        db.add(
            GiftCard(
                user_id=primary_customer.id,
                purchaser_id=admin.id,
                card_number="GC-ADMIN-OPS-0001",
                balance=25.0,
                initial_balance=25.0,
                status="active",
                expires_at=now_utc + timedelta(days=365),
            )
        )

        db.add(
            UserRiskState(
                user_id=primary_customer.id,
                risk_level="medium",
                cancel_7d=1,
                no_show_30d=1,
                manual_note="seeded risk state",
                updated_by=admin.id,
            )
        )

        db.add_all(
            [
                Referral(
                    referrer_id=primary_customer.id,
                    referee_id=invited_customer.id,
                    referral_code="ALICEOPS1",
                    status="rewarded",
                    referrer_reward_given=True,
                    referee_reward_given=True,
                    created_at=now_utc - timedelta(days=3),
                    rewarded_at=now_utc - timedelta(days=2),
                ),
                Referral(
                    referrer_id=referrer_customer.id,
                    referee_id=primary_customer.id,
                    referral_code="CHARLIE1",
                    status="registered",
                    referrer_reward_given=False,
                    referee_reward_given=False,
                    created_at=now_utc - timedelta(days=1),
                    rewarded_at=None,
                ),
            ]
        )

        db.add_all(
            [
                SecurityBlockLog(
                    ip_address="203.0.113.90",
                    path="/admin/customers",
                    method="GET",
                    scope="admin_api",
                    matched_rule_id=None,
                    block_reason="rate_limit",
                    user_id=primary_customer.id,
                    user_agent="CodexAdminSuite/1.0",
                    meta_json=json.dumps({"suite": "admin-ops", "kind": "seed"}, ensure_ascii=False),
                    created_at=now_utc - timedelta(minutes=20),
                ),
                SecurityBlockLog(
                    ip_address="203.0.113.91",
                    path="/admin/security",
                    method="POST",
                    scope="admin_login",
                    matched_rule_id=None,
                    block_reason="ip_deny",
                    user_id=None,
                    user_agent="CodexAdminSuite/1.0",
                    meta_json=json.dumps({"suite": "admin-ops", "kind": "seed"}, ensure_ascii=False),
                    created_at=now_utc - timedelta(minutes=10),
                ),
            ]
        )

        audit_seed_log = SystemLog(
            log_type="audit",
            level="info",
            module="admin_suite_seed",
            action="admin.seed.audit",
            message="Seeded audit log for admin smoke",
            operator_user_id=admin.id,
            target_type="customer",
            target_id=str(primary_customer.id),
            path="/admin-suite/audit",
            method="PATCH",
            status_code=200,
            latency_ms=45,
            before_json=json.dumps({"tags": ["seeded"]}, ensure_ascii=False),
            after_json=json.dumps({"tags": ["vip"]}, ensure_ascii=False),
            meta_json=json.dumps({"suite": "admin-ops", "phase": "seed"}, ensure_ascii=False),
            created_at=now_utc - timedelta(minutes=30),
        )
        db.add(audit_seed_log)
        db.add_all(
            [
                SystemLog(
                    log_type="security",
                    level="warn",
                    module="admin_suite_seed",
                    action="admin.seed.security",
                    message="Seeded security log for admin smoke",
                    operator_user_id=admin.id,
                    path="/admin-suite/security",
                    method="POST",
                    status_code=403,
                    latency_ms=80,
                    meta_json=json.dumps({"suite": "admin-ops", "scope": "security"}, ensure_ascii=False),
                    created_at=now_utc - timedelta(minutes=25),
                ),
                SystemLog(
                    log_type="error",
                    level="error",
                    module="admin_suite_seed",
                    action="admin.seed.error",
                    message="Seeded error log for admin smoke",
                    operator_user_id=admin.id,
                    path="/admin-suite/error",
                    method="GET",
                    status_code=500,
                    latency_ms=120,
                    meta_json=json.dumps({"suite": "admin-ops", "scope": "error"}, ensure_ascii=False),
                    created_at=now_utc - timedelta(minutes=15),
                ),
            ]
        )

        db.commit()
        db.refresh(audit_seed_log)
        db.refresh(pending_tomorrow)
        return SeedResult(
            admin_user_id=int(admin.id),
            store_id=int(store.id),
            premium_service_id=int(premium_service.id),
            basic_service_id=int(basic_service.id),
            primary_customer_id=int(primary_customer.id),
            invited_customer_id=int(invited_customer.id),
            referrer_customer_id=int(referrer_customer.id),
            pending_appointment_id=int(pending_tomorrow.id),
            audit_seed_log_id=int(audit_seed_log.id),
        )
    finally:
        db.close()


def login_admin() -> str:
    log("[STEP] Admin login")
    payload = request_json(
        "POST",
        "/auth/login",
        expected_statuses=(200,),
        json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD, "login_portal": "admin"},
    )
    token = payload.get("access_token")
    if not token:
        raise RuntimeError("admin login missing access_token")
    return str(token)


def find_list_item(items: List[Dict[str, Any]], *, key: str, expected: Any) -> Dict[str, Any]:
    for item in items:
        if item.get(key) == expected:
            return item
    raise AssertionError(f"missing list item where {key}={expected!r}")


def wait_for_audit_log(token: str, *, module: str, action: str, target_id: str, timeout_seconds: float = 6.0) -> Dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_payload: Dict[str, Any] | List[Any] = {}
    while time.monotonic() < deadline:
        payload = request_json(
            "GET",
            f"/logs/admin?module={module}&action={action}&skip=0&limit=20",
            token=token,
            expected_statuses=(200,),
        )
        last_payload = payload
        items = payload.get("items", []) if isinstance(payload, dict) else []
        for item in items:
            if str(item.get("target_id")) == str(target_id):
                return item
        time.sleep(0.3)
    raise AssertionError(f"audit log not visible for {module}/{action}: {last_payload}")


def verify_dashboard(token: str, seed: SeedResult) -> None:
    log("[STEP] Verify dashboard endpoints")
    summary = request_json("GET", "/dashboard/summary", token=token, expected_statuses=(200,))
    assert_equal(summary["today_appointments"], 1, "dashboard today appointments")
    assert_equal(float(summary["today_revenue"]), 90.0, "dashboard today revenue")
    assert_equal(summary["active_customers_week"], 1, "dashboard active customers week")
    assert_equal(float(summary["avg_ticket_week"]), 90.0, "dashboard avg ticket week")
    assert_equal(float(summary["avg_ticket_change_pct"]), 50.0, "dashboard avg ticket change pct")
    assert_equal(summary["scope"], "all_stores", "dashboard scope")
    assert_equal(summary["store_id"], None, "dashboard scoped store id")

    realtime = request_json(
        "GET",
        "/dashboard/realtime-notifications?limit=5",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(realtime["total"], 4, "dashboard realtime total")
    first_item = realtime["items"][0]
    assert_equal(first_item["appointment_id"], seed.pending_appointment_id, "dashboard latest appointment id")
    assert_equal(first_item["customer_name"], PRIMARY_CUSTOMER_NAME, "dashboard latest customer name")
    assert_equal(first_item["service_name"], "Admin Premium Gel", "dashboard latest service name")


def verify_customers(token: str, seed: SeedResult) -> None:
    log("[STEP] Verify customers admin endpoints")
    customer_list = request_json(
        "GET",
        "/customers/admin?keyword=Alice&include_full_phone=true&has_upcoming=true&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(customer_list["total"], 1, "customer list total")
    first_item = customer_list["items"][0]
    assert_equal(first_item["id"], seed.primary_customer_id, "customer list id")
    assert_equal(first_item["phone"], normalize_phone(PRIMARY_CUSTOMER_PHONE), "customer list full phone")
    assert_equal(first_item["total_appointments"], 4, "customer list total appointments")
    assert_equal(first_item["completed_count"], 2, "customer list completed count")
    assert_equal(first_item["no_show_count"], 1, "customer list no show count")

    detail = request_json(
        "GET",
        f"/customers/admin/{seed.primary_customer_id}?include_full_phone=true",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(detail["phone"], normalize_phone(PRIMARY_CUSTOMER_PHONE), "customer detail full phone")
    assert_equal(float(detail["lifetime_spent"]), 150.0, "customer lifetime spent")
    assert_equal(float(detail["cancel_rate"]), 0.25, "customer cancel rate")
    assert_equal(detail["tags"], ["seeded"], "customer initial tags")

    updated = request_json(
        "PUT",
        f"/customers/admin/{seed.primary_customer_id}/tags",
        token=token,
        expected_statuses=(200,),
        json={"tags": ["vip", "high-spend", "vip"]},
    )
    assert_equal(updated["tags"], ["vip", "high-spend"], "customer updated tags")

    appointments = request_json(
        "GET",
        f"/customers/admin/{seed.primary_customer_id}/appointments?status=completed&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(len(appointments), 2, "customer completed appointments count")
    appointment_numbers = {item["order_number"] for item in appointments}
    assert_equal(appointment_numbers, {"ADM-OPS-COMP-1", "ADM-OPS-COMP-2"}, "customer completed appointment orders")

    rewards = request_json(
        "GET",
        f"/customers/admin/{seed.primary_customer_id}/rewards?point_limit=10&coupon_limit=10&gift_card_limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(rewards["points"]["total_points"], 120, "rewards total points")
    assert_equal(rewards["points"]["available_points"], 80, "rewards available points")
    assert_equal(len(rewards["point_transactions"]), 2, "rewards point transaction count")
    assert_equal(len(rewards["coupons"]), 1, "rewards coupon count")
    assert_equal(rewards["coupons"][0]["coupon_name"], "Admin Ops Coupon", "rewards coupon name")
    assert_equal(len(rewards["gift_cards"]), 1, "rewards gift card count")
    assert_equal(float(rewards["gift_cards"][0]["balance"]), 25.0, "rewards gift card balance")

    referrals = request_json(
        "GET",
        f"/customers/admin/{seed.primary_customer_id}/referrals?include_full_phone=true",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(referrals["referred_by"]["user_id"], seed.referrer_customer_id, "customer referred_by user id")
    assert_equal(referrals["referred_by"]["user_phone"], normalize_phone(REFERRER_CUSTOMER_PHONE), "customer referred_by phone")
    assert_equal(len(referrals["invited_users"]), 1, "customer invited users count")
    assert_equal(referrals["invited_users"][0]["user_id"], seed.invited_customer_id, "customer invited user id")
    assert_equal(referrals["invited_users"][0]["user_phone"], normalize_phone(INVITED_CUSTOMER_PHONE), "customer invited user phone")


def verify_logs(token: str, seed: SeedResult) -> None:
    log("[STEP] Verify logs admin endpoints")
    log_list = request_json(
        "GET",
        "/logs/admin?module=admin_suite_seed&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(log_list["total"], 3, "seed log list total")
    audit_item = find_list_item(log_list["items"], key="id", expected=seed.audit_seed_log_id)
    assert_equal(audit_item["action"], "admin.seed.audit", "seed audit action")

    detail = request_json(
        "GET",
        f"/logs/admin/{seed.audit_seed_log_id}",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(detail["before"]["tags"], ["seeded"], "seed log detail before tags")
    assert_equal(detail["after"]["tags"], ["vip"], "seed log detail after tags")
    assert_equal(detail["meta"]["suite"], "admin-ops", "seed log detail meta suite")

    stats = request_json("GET", "/logs/admin/stats", token=token, expected_statuses=(200,))
    assert_true(int(stats["today_total"]) >= 3, "log stats today total should include seeded rows")
    assert_true(int(stats["today_error_count"]) >= 1, "log stats today error count should include seeded error")
    assert_true(int(stats["today_security_count"]) >= 1, "log stats today security count should include seeded security")
    assert_true(any(item["module"] == "admin_suite_seed" for item in stats["top_modules"]), "log stats top_modules missing admin_suite_seed")
    assert_true(any(item["path"] == "/admin-suite/error" for item in stats["top_error_paths"]), "log stats top_error_paths missing seeded error path")


def verify_risk(token: str, seed: SeedResult) -> None:
    log("[STEP] Verify risk endpoints")
    risk_users = request_json(
        "GET",
        "/risk/users?keyword=Alice&include_full_phone=true&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(len(risk_users), 1, "risk users result count")
    assert_equal(risk_users[0]["user_id"], seed.primary_customer_id, "risk user id")
    assert_equal(risk_users[0]["phone"], normalize_phone(PRIMARY_CUSTOMER_PHONE), "risk user full phone")
    assert_equal(risk_users[0]["risk_level"], "medium", "initial risk level")

    set_level = request_json(
        "PATCH",
        f"/risk/users/{seed.primary_customer_id}",
        token=token,
        expected_statuses=(200,),
        json={"action": "set_level", "risk_level": "high", "note": "manual high"},
    )
    assert_equal(set_level["risk_level"], "high", "risk set_level result")
    assert_equal(set_level["manual_note"], "manual high", "risk set_level note")

    restricted = request_json(
        "PATCH",
        f"/risk/users/{seed.primary_customer_id}",
        token=token,
        expected_statuses=(200,),
        json={"action": "restrict_24h", "hours": 6, "note": "manual restrict"},
    )
    assert_equal(restricted["risk_level"], "high", "risk restrict result")
    assert_true(bool(restricted["restricted_until"]), "risk restrict should set restricted_until")

    restricted_only = request_json(
        "GET",
        "/risk/users?keyword=Alice&restricted_only=true&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(len(restricted_only), 1, "risk restricted_only count")
    assert_equal(restricted_only[0]["user_id"], seed.primary_customer_id, "risk restricted_only user")

    unrestricted = request_json(
        "PATCH",
        f"/risk/users/{seed.primary_customer_id}",
        token=token,
        expected_statuses=(200,),
        json={"action": "unrestrict", "note": "manual clear"},
    )
    assert_equal(unrestricted["risk_level"], "normal", "risk unrestrict result")
    assert_equal(unrestricted["restricted_until"], None, "risk unrestrict restricted_until")


def verify_security(token: str, seed: SeedResult) -> None:
    log("[STEP] Verify security endpoints")
    summary_before = request_json("GET", "/security/summary", token=token, expected_statuses=(200,))
    assert_equal(summary_before["today_block_count"], 2, "security today block count before rules")
    assert_equal(summary_before["last_24h_block_count"], 2, "security last_24h block count before rules")
    assert_equal(summary_before["active_deny_rule_count"], 0, "security active deny before rules")
    assert_equal(summary_before["active_allow_rule_count"], 0, "security active allow before rules")

    block_logs = request_json(
        "GET",
        "/security/block-logs?path_keyword=admin&skip=0&limit=10",
        token=token,
        expected_statuses=(200,),
    )
    assert_equal(block_logs["total"], 2, "security block logs total")

    created_rule = request_json(
        "POST",
        "/security/ip-rules",
        token=token,
        expected_statuses=(201,),
        json={
            "rule_type": "allow",
            "target_type": "ip",
            "target_value": "203.0.113.10",
            "scope": "admin_api",
            "status": "active",
            "priority": 40,
            "reason": "Admin regression allow rule",
        },
    )
    assert_equal(created_rule["rule_type"], "allow", "security create allow rule type")
    assert_equal(created_rule["status"], "active", "security create allow rule status")

    updated_rule = request_json(
        "PATCH",
        f"/security/ip-rules/{created_rule['id']}",
        token=token,
        expected_statuses=(200,),
        json={
            "rule_type": "allow",
            "target_type": "ip",
            "target_value": "203.0.113.10",
            "scope": "admin_api",
            "status": "inactive",
            "priority": 55,
            "reason": "Admin regression allow rule disabled",
        },
    )
    assert_equal(updated_rule["status"], "inactive", "security update rule status")
    assert_equal(updated_rule["priority"], 55, "security update rule priority")

    quick_block = request_json(
        "POST",
        "/security/quick-block",
        token=token,
        expected_statuses=(201,),
        json={
            "target_type": "ip",
            "target_value": "198.51.100.10",
            "scope": "admin_login",
            "duration_hours": 4,
            "reason": "Admin regression quick block",
        },
    )
    assert_equal(quick_block["rule_type"], "deny", "security quick block rule type")
    assert_equal(quick_block["scope"], "admin_login", "security quick block scope")
    assert_equal(quick_block["status"], "active", "security quick block status")

    ip_rules = request_json(
        "GET",
        "/security/ip-rules?status=all&scope=all&skip=0&limit=20",
        token=token,
        expected_statuses=(200,),
    )
    returned_ids = {int(item["id"]) for item in ip_rules}
    assert_true(int(created_rule["id"]) in returned_ids, "security list missing created allow rule")
    assert_true(int(quick_block["id"]) in returned_ids, "security list missing quick block rule")

    summary_after = request_json("GET", "/security/summary", token=token, expected_statuses=(200,))
    assert_equal(summary_after["today_block_count"], 2, "security today block count after rules")
    assert_equal(summary_after["active_allow_rule_count"], 0, "security active allow after update")
    assert_equal(summary_after["active_deny_rule_count"], 1, "security active deny after quick block")

    security_log = wait_for_audit_log(
        token,
        module="security",
        action="security.quick_block",
        target_id=str(quick_block["id"]),
    )
    assert_equal(security_log["target_id"], str(quick_block["id"]), "security audit log target id")


def run_api_flow(seed: SeedResult) -> Dict[str, Any]:
    admin_token = login_admin()
    verify_dashboard(admin_token, seed)
    verify_customers(admin_token, seed)
    verify_logs(admin_token, seed)
    verify_risk(admin_token, seed)
    verify_security(admin_token, seed)
    return {
        "store_id": seed.store_id,
        "primary_customer_id": seed.primary_customer_id,
        "pending_appointment_id": seed.pending_appointment_id,
        "seed_audit_log_id": seed.audit_seed_log_id,
    }


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        summary = run_api_flow(seed)
        log("OK: admin operations regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: admin operations regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
