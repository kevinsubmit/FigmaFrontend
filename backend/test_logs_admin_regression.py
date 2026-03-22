"""
Backend admin regression smoke for logs/admin* endpoints.
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
    verify_logs,
)


def main() -> int:
    if CLEANUP_BEFORE:
        cleanup_dynamic_data()

    summary: Optional[Dict[str, Any]] = None
    try:
        seed = seed_minimal_data()
        admin_token = login_admin()
        verify_logs(admin_token, seed)
        summary = {
            "scope": "logs-admin",
            "seed_audit_log_id": seed.audit_seed_log_id,
        }
        log("OK: logs admin regression passed")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        log(f"FAIL: logs admin regression failed: {exc}")
        return 1
    finally:
        if CLEANUP_AFTER:
            cleanup_dynamic_data()


if __name__ == "__main__":
    sys.exit(main())
