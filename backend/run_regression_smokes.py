"""
Run backend regression smoke scripts from a single entrypoint.

Usage:
  python run_regression_smokes.py
  python run_regression_smokes.py --list
  python run_regression_smokes.py --only payment --only device-push-admin --only upload-notification
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SmokeCase:
    key: str
    label: str
    script_path: str


SMOKE_CASES: tuple[SmokeCase, ...] = (
    SmokeCase(
        key="payment",
        label="Payment Regression Smoke",
        script_path="test_payment_regression.py",
    ),
    SmokeCase(
        key="group-split",
        label="Group Split Regression Smoke",
        script_path="test_group_split_regression.py",
    ),
    SmokeCase(
        key="upload-notification",
        label="Upload Notification Regression Smoke",
        script_path="test_upload_notification_regression.py",
    ),
    SmokeCase(
        key="device-push-admin",
        label="Device Token Admin Push Regression Smoke",
        script_path="test_device_push_admin_regression.py",
    ),
    SmokeCase(
        key="coupon-referral",
        label="Coupon Referral Regression Smoke",
        script_path="test_coupon_referral_regression.py",
    ),
    SmokeCase(
        key="gift-card-transfer",
        label="Gift Card Transfer Regression Smoke",
        script_path="test_gift_card_transfer_regression.py",
    ),
    SmokeCase(
        key="complete-no-show",
        label="Appointment Complete No-Show Regression Smoke",
        script_path="test_complete_no_show_regression.py",
    ),
    SmokeCase(
        key="reschedule-cancel",
        label="Reschedule Cancel Regression Smoke",
        script_path="test_reschedule_cancel_regression.py",
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run backend regression smoke suite")
    parser.add_argument("--list", action="store_true", help="List available smoke keys")
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Run only selected smoke key. Repeatable.",
    )
    return parser.parse_args()


def resolve_selected_cases(only: list[str]) -> list[SmokeCase]:
    if not only:
        return list(SMOKE_CASES)

    wanted = {item.strip() for item in only if item.strip()}
    by_key = {case.key: case for case in SMOKE_CASES}
    unknown = sorted(wanted - set(by_key))
    if unknown:
        raise SystemExit(f"Unknown smoke key(s): {', '.join(unknown)}")
    return [case for case in SMOKE_CASES if case.key in wanted]


def run_case(case: SmokeCase, root: Path) -> None:
    script = root / case.script_path
    if not script.is_file():
        raise SystemExit(f"Smoke script not found: {script}")

    print(f"[RUN] {case.label} ({case.key})", flush=True)
    started_at = time.monotonic()
    completed = subprocess.run([sys.executable, str(script)], cwd=root)
    duration = time.monotonic() - started_at
    if completed.returncode != 0:
        raise SystemExit(f"[FAIL] {case.key} exited with code {completed.returncode}")
    print(f"[OK] {case.key} in {duration:.1f}s", flush=True)


def main() -> int:
    args = parse_args()
    if args.list:
        for case in SMOKE_CASES:
            print(f"{case.key}\t{case.script_path}")
        return 0

    root = Path(__file__).resolve().parent
    selected_cases = resolve_selected_cases(args.only)

    print(f"[SUITE] running {len(selected_cases)} smoke(s)", flush=True)
    suite_started_at = time.monotonic()
    for case in selected_cases:
        run_case(case, root)
    total_duration = time.monotonic() - suite_started_at
    print(f"[SUITE] success in {total_duration:.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
