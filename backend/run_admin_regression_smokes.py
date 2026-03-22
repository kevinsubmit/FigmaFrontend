"""
Run backend admin regression smoke scripts from a single entrypoint.

Usage:
  python run_admin_regression_smokes.py
  python run_admin_regression_smokes.py --list
  python run_admin_regression_smokes.py --only customers-admin --only security-admin
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
        key="dashboard-admin",
        label="Dashboard Admin Regression Smoke",
        script_path="test_dashboard_admin_regression.py",
    ),
    SmokeCase(
        key="customers-admin",
        label="Customers Admin Regression Smoke",
        script_path="test_customers_admin_regression.py",
    ),
    SmokeCase(
        key="risk-admin",
        label="Risk Admin Regression Smoke",
        script_path="test_risk_admin_regression.py",
    ),
    SmokeCase(
        key="security-admin",
        label="Security Admin Regression Smoke",
        script_path="test_security_admin_regression.py",
    ),
    SmokeCase(
        key="logs-admin",
        label="Logs Admin Regression Smoke",
        script_path="test_logs_admin_regression.py",
    ),
    SmokeCase(
        key="admin-ops",
        label="Admin Operations Full Regression Smoke",
        script_path="test_admin_ops_regression.py",
    ),
)

DEFAULT_SMOKE_KEYS: tuple[str, ...] = (
    "dashboard-admin",
    "customers-admin",
    "risk-admin",
    "security-admin",
    "logs-admin",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run backend admin regression smoke suite")
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
        wanted = set(DEFAULT_SMOKE_KEYS)
        return [case for case in SMOKE_CASES if case.key in wanted]

    wanted = {item.strip() for item in only if item.strip()}
    by_key = {case.key: case for case in SMOKE_CASES}
    unknown = sorted(wanted - set(by_key))
    if unknown:
        raise SystemExit(f"Unknown admin smoke key(s): {', '.join(unknown)}")
    return [case for case in SMOKE_CASES if case.key in wanted]


def run_case(case: SmokeCase, root: Path) -> None:
    script = root / case.script_path
    if not script.is_file():
        raise SystemExit(f"Admin smoke script not found: {script}")

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

    print(f"[ADMIN SUITE] running {len(selected_cases)} smoke(s)", flush=True)
    suite_started_at = time.monotonic()
    for case in selected_cases:
        run_case(case, root)
    total_duration = time.monotonic() - suite_started_at
    print(f"[ADMIN SUITE] success in {total_duration:.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
