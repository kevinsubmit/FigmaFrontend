#!/usr/bin/env python3
"""
Security smoke tests for API endpoints (SQLi/XSS/upload/auth hardening).

Usage:
  ADMIN_PHONE=1231231234 ADMIN_PASSWORD=xxx python3 scripts/security_smoke.py
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Callable, List, Optional

import httpx


API_BASE = os.getenv("API_BASE", "http://localhost:8000/api/v1").rstrip("/")
ADMIN_PHONE = os.getenv("ADMIN_PHONE", "").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
REQUEST_TIMEOUT = float(os.getenv("SECURITY_SMOKE_TIMEOUT", "15"))


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str


class SmokeRunner:
    def __init__(self, client: httpx.Client):
        self.client = client
        self.results: List[TestResult] = []
        self.token: Optional[str] = None
        self.store_id: Optional[int] = None

    def add_result(self, name: str, passed: bool, detail: str) -> None:
        self.results.append(TestResult(name=name, passed=passed, detail=detail))
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}: {detail}")

    def run_case(self, name: str, fn: Callable[[], None]) -> None:
        try:
            fn()
            self.add_result(name, True, "ok")
        except Exception as exc:  # noqa: BLE001
            self.add_result(name, False, f"{type(exc).__name__}: {exc}")

    def assert_status(self, resp: httpx.Response, expected: set[int], context: str) -> None:
        if resp.status_code not in expected:
            raise AssertionError(
                f"{context} expected status {sorted(expected)}, got {resp.status_code}, body={resp.text[:300]}"
            )

    def login_admin(self) -> None:
        if not ADMIN_PHONE or not ADMIN_PASSWORD:
            raise RuntimeError("Missing ADMIN_PHONE or ADMIN_PASSWORD environment variables")
        payload = {
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD,
            "login_portal": "admin",
        }
        resp = self.client.post(f"{API_BASE}/auth/login", json=payload)
        self.assert_status(resp, {200}, "admin login")
        token = resp.json().get("access_token")
        if not token:
            raise AssertionError(f"login response missing access_token: {resp.text}")
        self.token = token
        self.client.headers.update({"Authorization": f"Bearer {token}"})

    def resolve_store_id(self) -> None:
        env_store_id = os.getenv("TEST_STORE_ID", "").strip()
        if env_store_id:
            self.store_id = int(env_store_id)
            return
        resp = self.client.get(f"{API_BASE}/stores/", params={"limit": 1})
        self.assert_status(resp, {200}, "resolve store id")
        data = resp.json()
        if not isinstance(data, list) or not data:
            raise AssertionError("No store found. Set TEST_STORE_ID manually.")
        self.store_id = int(data[0]["id"])

    def check_unauthenticated_upload_blocked(self) -> None:
        anon = httpx.Client(timeout=REQUEST_TIMEOUT)
        try:
            resp = anon.post(
                f"{API_BASE}/upload/images",
                files={"files": ("x.png", b"fake image content", "image/png")},
            )
        finally:
            anon.close()
        self.assert_status(resp, {401, 403}, "unauthenticated upload should be blocked")

    def check_upload_invalid_image_rejected(self) -> None:
        resp = self.client.post(
            f"{API_BASE}/upload/images",
            files={"files": ("fake.png", b"not a real png", "image/png")},
        )
        self.assert_status(resp, {400}, "invalid image upload should be rejected")

    def check_avatar_invalid_image_rejected(self) -> None:
        resp = self.client.post(
            f"{API_BASE}/auth/me/avatar",
            files={"file": ("avatar.png", b"definitely-not-image", "image/png")},
        )
        self.assert_status(resp, {400}, "invalid avatar upload should be rejected")

    def check_avatar_url_xss_rejected(self) -> None:
        resp = self.client.put(
            f"{API_BASE}/users/profile",
            json={"avatar_url": "javascript:alert(1)"},
        )
        self.assert_status(resp, {400}, "avatar_url javascript: should be rejected")

    def check_store_image_url_xss_rejected(self) -> None:
        if self.store_id is None:
            raise AssertionError("store_id not initialized")
        resp = self.client.post(
            f"{API_BASE}/stores/{self.store_id}/images",
            params={"image_url": "javascript:alert(1)", "is_primary": 0, "display_order": 0},
        )
        self.assert_status(resp, {400}, "store image javascript: URL should be rejected")

    def check_pins_xss_title_rejected(self) -> None:
        payload = {
            "title": "<script>alert(1)</script>",
            "image_url": "/uploads/test.jpg",
            "description": "xss check",
            "status": "draft",
            "sort_order": 0,
            "tag_ids": [],
        }
        resp = self.client.post(f"{API_BASE}/pins/admin", json=payload)
        self.assert_status(resp, {400}, "pin title HTML/script should be rejected")

    def check_sqli_keyword_safe(self) -> None:
        sqli_like = "' OR 1=1 --"
        resp = self.client.get(f"{API_BASE}/reviews/admin", params={"keyword": sqli_like, "limit": 5})
        self.assert_status(resp, {200}, "SQLi-like keyword should not break endpoint")

    def summary(self) -> int:
        total = len(self.results)
        failed = sum(1 for item in self.results if not item.passed)
        print("\n=== Security Smoke Summary ===")
        print(f"API_BASE: {API_BASE}")
        print(f"Total: {total}, Passed: {total - failed}, Failed: {failed}")
        return 1 if failed else 0


def main() -> int:
    print(f"Running security smoke tests against: {API_BASE}")
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        runner = SmokeRunner(client)
        runner.run_case("Admin login", runner.login_admin)
        runner.run_case("Resolve store id", runner.resolve_store_id)
        runner.run_case("Unauthenticated upload blocked", runner.check_unauthenticated_upload_blocked)
        runner.run_case("Invalid general image upload rejected", runner.check_upload_invalid_image_rejected)
        runner.run_case("Invalid avatar upload rejected", runner.check_avatar_invalid_image_rejected)
        runner.run_case("avatar_url XSS payload rejected", runner.check_avatar_url_xss_rejected)
        runner.run_case("Store image_url XSS payload rejected", runner.check_store_image_url_xss_rejected)
        runner.run_case("Pins title script payload rejected", runner.check_pins_xss_title_rejected)
        runner.run_case("SQLi-like keyword query remains safe", runner.check_sqli_keyword_safe)
        return runner.summary()


if __name__ == "__main__":
    sys.exit(main())
