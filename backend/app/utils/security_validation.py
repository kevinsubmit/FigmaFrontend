"""
Security validation helpers for input and upload hardening.
"""
from __future__ import annotations

import re
from typing import Optional, Set, Tuple

from PIL import Image, UnidentifiedImageError
from PIL import ImageFile
import io


DEFAULT_MAX_PIXELS = 20_000_000
HTML_BRACKET_PATTERN = re.compile(r"[<>]")


def sanitize_plain_text(
    value: Optional[str],
    *,
    field_name: str,
    max_length: int = 500,
) -> Optional[str]:
    """Normalize text and block HTML/script-style payloads."""
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if len(normalized) > max_length:
        raise ValueError(f"{field_name} is too long (max {max_length})")
    if HTML_BRACKET_PATTERN.search(normalized):
        raise ValueError(f"{field_name} cannot contain HTML/script content")
    return normalized


def validate_image_bytes(
    content: bytes,
    *,
    allowed_formats: Optional[Set[str]] = None,
    max_pixels: int = DEFAULT_MAX_PIXELS,
) -> Tuple[str, int, int]:
    """
    Validate image bytes by actual decode, format check, and dimension limits.
    Returns: (format, width, height)
    """
    if not content:
        raise ValueError("Empty file content")

    # Ensure truncated files are rejected.
    ImageFile.LOAD_TRUNCATED_IMAGES = False

    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
        with Image.open(io.BytesIO(content)) as img2:
            detected_format = (img2.format or "").upper()
            width, height = img2.size
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image file content") from exc

    if allowed_formats and detected_format not in allowed_formats:
        allowed = ", ".join(sorted(allowed_formats))
        raise ValueError(f"Invalid image format. Allowed: {allowed}")

    if width <= 0 or height <= 0:
        raise ValueError("Invalid image dimensions")
    if width * height > max_pixels:
        raise ValueError("Image dimensions are too large")

    return detected_format, width, height
