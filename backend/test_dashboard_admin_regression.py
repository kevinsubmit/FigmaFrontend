"""
Backend admin regression smoke for dashboard/* endpoints.
"""
from __future__ import annotations

import json
import sys
from typing import Any, Dict, Optional

from test_admin_ops_regression import (
    CLEANUP_AFTER,
    CLEANUP_BEFORE,
    cleanup_dynamic_data,
    login_admin,
    log,
    seed_minimal_data,
    verify_dashboard,
)


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        admin_token = login_admin()
        verify_dashboard(admin_token, seed)
        summary = {
            "scope": "dashboard-admin",
            "store_id": seed.store_id,
            "pending_appointment_id": seed.pending_appointment_id,
        }
        log("OK: dashboard admin regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: dashboard admin regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
