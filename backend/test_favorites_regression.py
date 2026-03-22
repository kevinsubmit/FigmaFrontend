"""
End-to-end regression script for store + pin favorites flow.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal stores / tags / pins
3. Register + login one customer
4. Verify initial is-favorited/count state
5. Add store + pin favorites
6. Verify duplicate add is rejected
7. Verify list/count/is-favorited linkage
8. Remove one favorite from each type
9. Verify remove-not-found behavior and remaining favorite state

Usage:
  cd backend
  python test_favorites_regression.py
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

from app.db.session import SessionLocal
from app.models.pin import Pin, Tag
from app.models.pin_favorite import PinFavorite
from app.models.store import Store
from app.models.store_favorite import StoreFavorite


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

CUSTOMER_PHONE = os.getenv("CUSTOMER_PHONE", "2126663661")
CUSTOMER_PASSWORD = os.getenv("CUSTOMER_PASSWORD", "FavoritesPass123")
CUSTOMER_USERNAME = os.getenv("CUSTOMER_USERNAME", "favorites_customer")

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
    store_ids: Tuple[int, int]
    pin_ids: Tuple[int, int]
    tag_id: int


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
    log("[STEP] Seed minimal stores / tags / pins")
    db: Session = SessionLocal()
    try:
        store_a = Store(
            name="Favorites Store A",
            address="101 Favorite Ave",
            city="New York",
            state="NY",
            zip_code="10011",
            phone="12125550151",
            email="favorite-store-a@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=4.7,
            review_count=12,
            description="First favorites regression store",
        )
        store_b = Store(
            name="Favorites Store B",
            address="202 Favorite Ave",
            city="Brooklyn",
            state="NY",
            zip_code="11211",
            phone="12125550152",
            email="favorite-store-b@example.com",
            is_visible=True,
            time_zone="America/New_York",
            rating=4.8,
            review_count=18,
            description="Second favorites regression store",
        )
        db.add_all([store_a, store_b])
        db.flush()

        tag = Tag(name="Favorites", is_active=True, show_on_home=True, sort_order=0)
        db.add(tag)
        db.flush()

        pin_a = Pin(
            title="Favorites Pin A",
            image_url="/uploads/favorites-pin-a.jpg",
            description="First favorites regression pin",
            status="published",
            sort_order=0,
            is_deleted=False,
        )
        pin_a.tags.append(tag)

        pin_b = Pin(
            title="Favorites Pin B",
            image_url="/uploads/favorites-pin-b.jpg",
            description="Second favorites regression pin",
            status="published",
            sort_order=1,
            is_deleted=False,
        )
        pin_b.tags.append(tag)

        db.add_all([pin_a, pin_b])
        db.commit()
        db.refresh(store_a)
        db.refresh(store_b)
        db.refresh(pin_a)
        db.refresh(pin_b)
        db.refresh(tag)
        return SeedResult(
            store_ids=(int(store_a.id), int(store_b.id)),
            pin_ids=(int(pin_a.id), int(pin_b.id)),
            tag_id=int(tag.id),
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
    verify_payload = request_json(
        "POST",
        "/auth/verify-code",
        expected_statuses=(200,),
        json={"phone": CUSTOMER_PHONE, "code": "123456", "purpose": "register"},
    )
    assert_equal(verify_payload["valid"], True, "verification valid")
    return request_json(
        "POST",
        "/auth/register",
        expected_statuses=(201,),
        json={
            "phone": CUSTOMER_PHONE,
            "username": CUSTOMER_USERNAME,
            "full_name": "Favorites Customer",
            "email": "favorites@example.com",
            "password": CUSTOMER_PASSWORD,
            "verification_code": "123456",
        },
    )


def login_customer() -> str:
    payload = request_json(
        "POST",
        "/auth/login",
        expected_statuses=(200,),
        json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD,
            "login_portal": "frontend",
        },
    )
    token = payload.get("access_token")
    if not token:
        raise RuntimeError("favorites login missing access_token")
    return str(token)


def assert_db_favorite_counts(*, expected_store: int, expected_pin: int) -> None:
    db: Session = SessionLocal()
    try:
        store_count = db.query(StoreFavorite).count()
        pin_count = db.query(PinFavorite).count()
        assert_equal(store_count, expected_store, "db store favorites count")
        assert_equal(pin_count, expected_pin, "db pin favorites count")
    finally:
        db.close()


def collect_ids(rows: List[Dict[str, Any]]) -> set[int]:
    return {int(row["id"]) for row in rows}


def main() -> int:
    try:
        if CLEANUP_BEFORE:
            cleanup_dynamic_data()

        seed = seed_minimal_data()

        log("[STEP] Register and login customer")
        customer_payload = register_customer()
        customer_user_id = int(customer_payload["id"])
        token = login_customer()

        store_a_id, store_b_id = seed.store_ids
        pin_a_id, pin_b_id = seed.pin_ids

        log("[STEP] Verify initial favorite state")
        assert_equal(request_json("GET", f"/stores/{store_a_id}/is-favorited", token=token)["is_favorited"], False, "store A initial is_favorited")
        assert_equal(request_json("GET", f"/pins/{pin_a_id}/is-favorited", token=token)["is_favorited"], False, "pin A initial is_favorited")
        assert_equal(request_json("GET", "/stores/favorites/count", token=token)["count"], 0, "initial store favorites count")
        assert_equal(request_json("GET", "/pins/favorites/count", token=token)["count"], 0, "initial pin favorites count")
        assert_db_favorite_counts(expected_store=0, expected_pin=0)

        log("[STEP] Add favorites and reject duplicate adds")
        assert_equal(request_json("POST", f"/stores/{store_a_id}/favorite", token=token, expected_statuses=(201,))["store_id"], store_a_id, "store A favorite add")
        assert_equal(request_json("POST", f"/pins/{pin_a_id}/favorite", token=token, expected_statuses=(201,))["pin_id"], pin_a_id, "pin A favorite add")
        duplicate_store = request_json("POST", f"/stores/{store_a_id}/favorite", token=token, expected_statuses=(400,))
        duplicate_pin = request_json("POST", f"/pins/{pin_a_id}/favorite", token=token, expected_statuses=(400,))
        assert_equal(duplicate_store["detail"], "Store already in favorites", "duplicate store favorite detail")
        assert_equal(duplicate_pin["detail"], "Pin already in favorites", "duplicate pin favorite detail")

        assert_equal(request_json("POST", f"/stores/{store_b_id}/favorite", token=token, expected_statuses=(201,))["store_id"], store_b_id, "store B favorite add")
        assert_equal(request_json("POST", f"/pins/{pin_b_id}/favorite", token=token, expected_statuses=(201,))["pin_id"], pin_b_id, "pin B favorite add")
        assert_db_favorite_counts(expected_store=2, expected_pin=2)

        log("[STEP] Verify count/list/is-favorited linkage")
        assert_equal(request_json("GET", f"/stores/{store_a_id}/is-favorited", token=token)["is_favorited"], True, "store A is_favorited after add")
        assert_equal(request_json("GET", f"/pins/{pin_a_id}/is-favorited", token=token)["is_favorited"], True, "pin A is_favorited after add")
        assert_equal(request_json("GET", "/stores/favorites/count", token=token)["count"], 2, "store favorites count after adds")
        assert_equal(request_json("GET", "/pins/favorites/count", token=token)["count"], 2, "pin favorites count after adds")

        store_rows = request_json("GET", "/stores/favorites/my-favorites?skip=0&limit=10", token=token, expected_statuses=(200,))
        pin_rows = request_json("GET", "/pins/favorites/my-favorites?skip=0&limit=10", token=token, expected_statuses=(200,))
        assert_equal(len(store_rows), 2, "store favorites list length")
        assert_equal(len(pin_rows), 2, "pin favorites list length")
        assert_equal(collect_ids(store_rows), {store_a_id, store_b_id}, "store favorites ids")
        assert_equal(collect_ids(pin_rows), {pin_a_id, pin_b_id}, "pin favorites ids")
        assert_equal(len(request_json("GET", "/stores/favorites/my-favorites?skip=0&limit=1", token=token, expected_statuses=(200,))), 1, "store favorites limit=1")
        assert_equal(len(request_json("GET", "/pins/favorites/my-favorites?skip=0&limit=1", token=token, expected_statuses=(200,))), 1, "pin favorites limit=1")
        assert_true(any(row.get("tags") == ["Favorites"] for row in pin_rows), "pin favorites should include active tag name")

        log("[STEP] Remove one favorite from each type")
        assert_equal(request_json("DELETE", f"/stores/{store_a_id}/favorite", token=token)["store_id"], store_a_id, "store A favorite remove")
        assert_equal(request_json("DELETE", f"/pins/{pin_a_id}/favorite", token=token)["pin_id"], pin_a_id, "pin A favorite remove")
        assert_db_favorite_counts(expected_store=1, expected_pin=1)

        assert_equal(request_json("GET", f"/stores/{store_a_id}/is-favorited", token=token)["is_favorited"], False, "store A unfavorited after remove")
        assert_equal(request_json("GET", f"/pins/{pin_a_id}/is-favorited", token=token)["is_favorited"], False, "pin A unfavorited after remove")
        assert_equal(request_json("GET", f"/stores/{store_b_id}/is-favorited", token=token)["is_favorited"], True, "store B still favorited")
        assert_equal(request_json("GET", f"/pins/{pin_b_id}/is-favorited", token=token)["is_favorited"], True, "pin B still favorited")
        assert_equal(request_json("GET", "/stores/favorites/count", token=token)["count"], 1, "store favorites count after remove")
        assert_equal(request_json("GET", "/pins/favorites/count", token=token)["count"], 1, "pin favorites count after remove")

        remaining_store_rows = request_json("GET", "/stores/favorites/my-favorites?skip=0&limit=10", token=token, expected_statuses=(200,))
        remaining_pin_rows = request_json("GET", "/pins/favorites/my-favorites?skip=0&limit=10", token=token, expected_statuses=(200,))
        assert_equal(collect_ids(remaining_store_rows), {store_b_id}, "remaining store favorite ids")
        assert_equal(collect_ids(remaining_pin_rows), {pin_b_id}, "remaining pin favorite ids")

        not_found_store = request_json("DELETE", f"/stores/{store_a_id}/favorite", token=token, expected_statuses=(404,))
        not_found_pin = request_json("DELETE", f"/pins/{pin_a_id}/favorite", token=token, expected_statuses=(404,))
        assert_equal(not_found_store["detail"], "Store not in favorites", "store remove missing detail")
        assert_equal(not_found_pin["detail"], "Pin not in favorites", "pin remove missing detail")

        summary = {
            "customer_user_id": customer_user_id,
            "store_ids": [store_a_id, store_b_id],
            "pin_ids": [pin_a_id, pin_b_id],
            "remaining_store_favorite_ids": sorted(collect_ids(remaining_store_rows)),
            "remaining_pin_favorite_ids": sorted(collect_ids(remaining_pin_rows)),
            "store_favorites_count": 1,
            "pin_favorites_count": 1,
        }
        print("OK: favorites regression passed")
        print(json.dumps(summary, indent=2))
        return 0
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
