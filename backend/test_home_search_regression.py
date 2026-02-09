"""
Regression check for H5 home search behavior.

Checks:
1) search matches by title (case-insensitive)
2) no-match keyword returns empty list
"""
from __future__ import annotations

import sys
from typing import List, Tuple

import requests


BASE_URL = "http://localhost:8000/api/v1"


def run_case(query: str, expect_non_empty: bool) -> Tuple[bool, str]:
    response = requests.get(
        f"{BASE_URL}/pins",
        params={"search": query, "limit": 50},
        timeout=10,
    )
    if response.status_code != 200:
        return False, f"status={response.status_code}, body={response.text}"

    rows = response.json()
    count = len(rows)
    titles = [item.get("title") for item in rows[:8]]
    if expect_non_empty and count == 0:
        return False, f"expected match, got count=0"
    if (not expect_non_empty) and count != 0:
        return False, f"expected 0, got count={count}, titles={titles}"
    return True, f"count={count}, titles={titles}"


def main() -> int:
    cases: List[Tuple[str, bool]] = [
        ("Y2K Pop", True),
        ("y2k pop", True),
        ("French", True),
        ("Classic French Set", True),
        ("random-no-hit-xyz", False),
    ]
    has_fail = False
    print("=== H5 Home Search Regression ===")
    for query, expect_non_empty in cases:
        ok, msg = run_case(query, expect_non_empty=expect_non_empty)
        tag = "PASS" if ok else "FAIL"
        print(f"[{tag}] query={query!r}: {msg}")
        if not ok:
            has_fail = True
    print("=== End ===")
    return 1 if has_fail else 0


if __name__ == "__main__":
    sys.exit(main())
