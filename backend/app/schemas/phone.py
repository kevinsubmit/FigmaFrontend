"""
Phone normalization helpers.
"""

import re


def normalize_us_phone(raw_phone: str, error_message: str = "手机号格式不正确") -> str:
    """
    Normalize US phone number to 11-digit format with leading country code `1`.

    Accepted inputs:
    - 10 digits: NXXNXXXXXX
    - 11 digits and starts with 1: 1NXXNXXXXXX
    """
    phone_digits = re.sub(r"\D", "", raw_phone or "")
    if len(phone_digits) == 10:
        return f"1{phone_digits}"
    if len(phone_digits) == 11 and phone_digits.startswith("1"):
        return phone_digits
    raise ValueError(error_message)

