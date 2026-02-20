"""
Phone privacy helpers: masking and anti-enumeration checks.
"""
from __future__ import annotations

import re
from typing import Optional


def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "-"
    raw = str(phone).strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) >= 11 and digits.startswith("1"):
        return f"+1******{digits[-4:]}"
    if len(digits) >= 10:
        return f"******{digits[-4:]}"
    if len(digits) >= 4:
        return f"***{digits[-4:]}"
    return "***"


def validate_keyword_min_length(keyword: Optional[str], *, min_length: int = 3) -> None:
    if keyword is None:
        return
    if len(keyword.strip()) < min_length:
        raise ValueError(f"Keyword must be at least {min_length} characters")
