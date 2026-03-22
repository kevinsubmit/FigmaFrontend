"""
Backend admin regression smoke for risk/* endpoints.
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
    verify_risk,
)


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        admin_token = login_admin()
        verify_risk(admin_token, seed)
        summary = {
            "scope": "risk-admin",
            "primary_customer_id": seed.primary_customer_id,
        }
        log("OK: risk admin regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: risk admin regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
