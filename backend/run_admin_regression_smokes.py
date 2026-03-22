"""
Run backend admin regression smoke scripts from a single entrypoint.

Usage:
  python run_admin_regression_smokes.py
  python run_admin_regression_smokes.py --list
  python run_admin_regression_smokes.py --only customers-admin --only security-admin
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

RESULT_SCHEMA_VERSION = 1


@dataclass(frozen=True)
class SmokeCase:
    key: str
    label: str
    script_path: str


@dataclass(frozen=True)
class SmokeRunResult:
    key: str
    label: str
    script_path: str
    status: str
    returncode: int
    duration_seconds: float
    started_at_utc: str
    finished_at_utc: str
    error_message: str | None = None


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
    parser.add_argument(
        "--results-file",
        help="Write machine-readable suite results to this JSON file.",
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


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_results_file(
    path: str,
    selected_cases: list[SmokeCase],
    results: list[SmokeRunResult],
    suite_status: str,
    suite_started_at: str,
    suite_finished_at: str,
    duration_seconds: float,
) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": RESULT_SCHEMA_VERSION,
        "suite": "backend-admin-regression-smokes",
        "status": suite_status,
        "started_at_utc": suite_started_at,
        "finished_at_utc": suite_finished_at,
        "duration_seconds": round(duration_seconds, 3),
        "selected_keys": [case.key for case in selected_cases],
        "summary": {
            "total": len(selected_cases),
            "passed": sum(1 for result in results if result.status == "passed"),
            "failed": sum(1 for result in results if result.status == "failed"),
        },
        "results": [asdict(result) for result in results],
    }
    destination.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def run_case(case: SmokeCase, root: Path) -> SmokeRunResult:
    script = root / case.script_path
    if not script.is_file():
        started_at_iso = utc_now_iso()
        finished_at = utc_now_iso()
        return SmokeRunResult(
            key=case.key,
            label=case.label,
            script_path=case.script_path,
            status="failed",
            returncode=127,
            duration_seconds=0.0,
            started_at_utc=started_at_iso,
            finished_at_utc=finished_at,
            error_message=f"Admin smoke script not found: {script}",
        )

    print(f"[RUN] {case.label} ({case.key})", flush=True)
    started_at_iso = utc_now_iso()
    started_at = time.monotonic()
    completed = subprocess.run([sys.executable, str(script)], cwd=root)
    duration = time.monotonic() - started_at
    finished_at = utc_now_iso()
    if completed.returncode != 0:
        print(f"[FAIL] {case.key} exited with code {completed.returncode}", flush=True)
        return SmokeRunResult(
            key=case.key,
            label=case.label,
            script_path=case.script_path,
            status="failed",
            returncode=completed.returncode,
            duration_seconds=round(duration, 3),
            started_at_utc=started_at_iso,
            finished_at_utc=finished_at,
            error_message=f"{case.key} exited with code {completed.returncode}",
        )
    print(f"[OK] {case.key} in {duration:.1f}s", flush=True)
    return SmokeRunResult(
        key=case.key,
        label=case.label,
        script_path=case.script_path,
        status="passed",
        returncode=0,
        duration_seconds=round(duration, 3),
        started_at_utc=started_at_iso,
        finished_at_utc=finished_at,
    )


def main() -> int:
    args = parse_args()
    if args.list:
        for case in SMOKE_CASES:
            print(f"{case.key}\t{case.script_path}")
        return 0

    root = Path(__file__).resolve().parent
    selected_cases = resolve_selected_cases(args.only)

    print(f"[ADMIN SUITE] running {len(selected_cases)} smoke(s)", flush=True)
    suite_started_at_iso = utc_now_iso()
    suite_started_at = time.monotonic()
    results: list[SmokeRunResult] = []
    exit_code = 0
    for case in selected_cases:
        result = run_case(case, root)
        results.append(result)
        if result.status != "passed":
            exit_code = result.returncode or 1
            break

    total_duration = time.monotonic() - suite_started_at
    suite_finished_at_iso = utc_now_iso()
    suite_status = "passed" if exit_code == 0 else "failed"
    if args.results_file:
        write_results_file(
            path=args.results_file,
            selected_cases=selected_cases,
            results=results,
            suite_status=suite_status,
            suite_started_at=suite_started_at_iso,
            suite_finished_at=suite_finished_at_iso,
            duration_seconds=total_duration,
        )

    if exit_code == 0:
        print(f"[ADMIN SUITE] success in {total_duration:.1f}s", flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
