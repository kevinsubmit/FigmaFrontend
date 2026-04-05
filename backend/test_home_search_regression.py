"""
End-to-end regression script for public home feed tags / theme / search behavior.

Flow covered:
1. Cleanup previous dynamic regression data
2. Seed minimal tags / pins / active home theme
3. Verify public tags list
4. Verify public theme payload
5. Verify default feed respects active theme tag
6. Verify tag-scoped search remains case-insensitive and excludes draft/deleted pins

Usage:
  cd backend
  python test_home_search_regression.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Sequence, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.crud.pin import HOME_FEED_THEME_CACHE_KEY, PUBLIC_TAG_NAMES_CACHE_KEY
from app.db.session import SessionLocal
from app.models.home_feed_theme import HomeFeedThemeSetting
from app.models.pin import Pin, Tag
from app.services import cache_service


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
CLEANUP_BEFORE = os.getenv("CLEANUP_BEFORE", "1") != "0"
CLEANUP_AFTER = os.getenv("CLEANUP_AFTER", "1") == "1"

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
    y2k_tag_id: int
    french_tag_id: int
    chrome_tag_id: int
    y2k_pin_id: int
    french_pin_id: int
    classic_french_pin_id: int
    chrome_pin_id: int


def log(message: str) -> None:
    print(message, flush=True)


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def assert_true(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)


def request_json(
    path: str,
    *,
    params: Dict[str, Any] | None = None,
    expected_statuses: Tuple[int, ...] = (200,),
) -> Dict[str, Any] | list[Any]:
    query = ""
    if params:
        query = "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url=f"{BASE_URL}{path}{query}", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            raw = response.read().decode("utf-8") if response.length != 0 else ""
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read().decode("utf-8") if exc.fp else ""
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GET {path} failed to connect: {exc}") from exc

    try:
        payload = json.loads(raw) if raw else {}
    except Exception:
        payload = {"raw": raw}

    if status not in expected_statuses:
        raise RuntimeError(f"GET {path} failed: status={status}, body={payload}")
    return payload


def clear_pin_public_caches() -> None:
    cache_service.delete_many([PUBLIC_TAG_NAMES_CACHE_KEY, HOME_FEED_THEME_CACHE_KEY])


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
    clear_pin_public_caches()


def seed_home_feed_data() -> SeedResult:
    log("[STEP] Seed minimal tags / pins / active home theme")
    db: Session = SessionLocal()
    try:
        y2k_tag = Tag(name="Y2K Pop", is_active=True, show_on_home=True, sort_order=1)
        french_tag = Tag(name="French", is_active=True, show_on_home=True, sort_order=2)
        chrome_tag = Tag(name="Chrome", is_active=True, show_on_home=True, sort_order=3)
        hidden_tag = Tag(name="Hidden", is_active=True, show_on_home=False, sort_order=9)
        db.add_all([y2k_tag, french_tag, chrome_tag, hidden_tag])
        db.flush()

        y2k_pin = Pin(
            title="Y2K Pop Blast",
            image_url="https://example.com/y2k-pop-blast.jpg",
            description="Theme-default Y2K design",
            status="published",
            sort_order=1,
            is_deleted=False,
        )
        y2k_pin.tags = [y2k_tag]

        french_pin = Pin(
            title="French Bloom",
            image_url="https://example.com/french-bloom.jpg",
            description="French search result",
            status="published",
            sort_order=2,
            is_deleted=False,
        )
        french_pin.tags = [french_tag]

        classic_french_pin = Pin(
            title="Classic French Set",
            image_url="https://example.com/classic-french-set.jpg",
            description="Specific title search result",
            status="published",
            sort_order=3,
            is_deleted=False,
        )
        classic_french_pin.tags = [french_tag]

        chrome_pin = Pin(
            title="Chrome Mirror",
            image_url="https://example.com/chrome-mirror.jpg",
            description="Another public pin",
            status="published",
            sort_order=4,
            is_deleted=False,
        )
        chrome_pin.tags = [chrome_tag]

        draft_pin = Pin(
            title="Y2K Pop Draft Hidden",
            image_url="https://example.com/y2k-pop-draft.jpg",
            description="Draft should never leak into public search",
            status="draft",
            sort_order=5,
            is_deleted=False,
        )
        draft_pin.tags = [y2k_tag]

        deleted_pin = Pin(
            title="French Deleted Hidden",
            image_url="https://example.com/french-deleted.jpg",
            description="Soft-deleted pin should never leak into public search",
            status="published",
            sort_order=6,
            is_deleted=True,
        )
        deleted_pin.tags = [french_tag]

        hidden_tag_pin = Pin(
            title="Hidden Tag Design",
            image_url="https://example.com/hidden-tag-design.jpg",
            description="Tag exists but should not appear in public tag list",
            status="published",
            sort_order=7,
            is_deleted=False,
        )
        hidden_tag_pin.tags = [hidden_tag]

        db.add_all([y2k_pin, french_pin, classic_french_pin, chrome_pin, draft_pin, deleted_pin, hidden_tag_pin])
        db.flush()

        now = datetime.utcnow()
        theme = HomeFeedThemeSetting(
            enabled=True,
            tag_id=y2k_tag.id,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=1),
            updated_by=None,
        )
        db.add(theme)
        db.commit()
        db.refresh(y2k_tag)
        db.refresh(french_tag)
        db.refresh(chrome_tag)
        db.refresh(y2k_pin)
        db.refresh(french_pin)
        db.refresh(classic_french_pin)
        db.refresh(chrome_pin)
        clear_pin_public_caches()
        return SeedResult(
            y2k_tag_id=int(y2k_tag.id),
            french_tag_id=int(french_tag.id),
            chrome_tag_id=int(chrome_tag.id),
            y2k_pin_id=int(y2k_pin.id),
            french_pin_id=int(french_pin.id),
            classic_french_pin_id=int(classic_french_pin.id),
            chrome_pin_id=int(chrome_pin.id),
        )
    finally:
        db.close()


def extract_titles(rows: List[Dict[str, Any]]) -> List[str]:
    return [str(item.get("title")) for item in rows]


def assert_titles(rows: List[Dict[str, Any]], expected_titles: List[str], label: str) -> None:
    titles = extract_titles(rows)
    assert_equal(titles, expected_titles, label)


def run_public_flow(seed: SeedResult) -> Dict[str, Any]:
    log("[STEP] Verify public tag list")
    tags_payload = request_json("/pins/tags")
    assert_equal(tags_payload, ["Y2K Pop", "French", "Chrome"], "public tag names")

    log("[STEP] Verify public home theme payload")
    theme_payload = request_json("/pins/theme/public")
    assert_equal(theme_payload["enabled"], True, "theme enabled")
    assert_equal(theme_payload["active"], True, "theme active")
    assert_equal(theme_payload["tag_id"], seed.y2k_tag_id, "theme tag id")
    assert_equal(theme_payload["tag_name"], "Y2K Pop", "theme tag name")

    log("[STEP] Verify default feed respects active theme tag")
    default_feed = request_json("/pins", params={"limit": 20})
    assert_equal(len(default_feed), 1, "default feed count under active theme")
    assert_titles(default_feed, ["Y2K Pop Blast"], "default feed titles")

    default_search = request_json("/pins", params={"search": "Y2K Pop", "limit": 20})
    assert_equal(len(default_search), 1, "default theme search count")
    assert_titles(default_search, ["Y2K Pop Blast"], "default theme search titles")

    blocked_by_theme = request_json("/pins", params={"search": "French", "limit": 20})
    assert_equal(blocked_by_theme, [], "theme-filtered search excludes non-theme pins")

    log("[STEP] Verify explicit tag search and case-insensitive title matching")
    french_feed = request_json("/pins", params={"tag": "French", "limit": 20})
    assert_equal(len(french_feed), 2, "french feed count")
    assert_titles(french_feed, ["French Bloom", "Classic French Set"], "french feed titles")

    french_search = request_json("/pins", params={"tag": "French", "search": "French", "limit": 20})
    assert_equal(len(french_search), 2, "french search count")
    assert_titles(french_search, ["French Bloom", "Classic French Set"], "french search titles")

    classic_search = request_json("/pins", params={"tag": "French", "search": "classic french set", "limit": 20})
    assert_equal(len(classic_search), 1, "classic french exact search count")
    assert_titles(classic_search, ["Classic French Set"], "classic french exact search title")

    no_hit = request_json("/pins", params={"tag": "French", "search": "random-no-hit-xyz", "limit": 20})
    assert_equal(no_hit, [], "no-hit search empty")

    chrome_feed = request_json("/pins", params={"tag": "Chrome", "limit": 20})
    assert_titles(chrome_feed, ["Chrome Mirror"], "chrome feed title")

    summary = {
        "public_tag_count": len(tags_payload),
        "theme_tag_name": theme_payload["tag_name"],
        "default_feed_titles": extract_titles(default_feed),
        "french_feed_titles": extract_titles(french_feed),
        "classic_search_titles": extract_titles(classic_search),
        "chrome_feed_titles": extract_titles(chrome_feed),
    }
    print("OK: home search regression passed")
    print(json.dumps(summary, indent=2))
    return summary


def main() -> int:
    try:
        if CLEANUP_BEFORE:
            cleanup_dynamic_data()
        seed = seed_home_feed_data()
        run_public_flow(seed)
        return 0
    except Exception as exc:
        log(f"FAIL: home search regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
