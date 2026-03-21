"""
Upload file processing and delivery helpers.
"""
from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse, Response

from app.core.config import settings
from app.utils.clamav_scanner import scan_bytes_for_malware
from app.utils.security_validation import validate_image_bytes

UPLOAD_SERVING_MODE_APP = "app"
UPLOAD_SERVING_MODE_REDIRECT = "redirect"
UPLOAD_SERVING_MODE_X_ACCEL = "x_accel_redirect"
UPLOAD_SERVING_MODES = {
    UPLOAD_SERVING_MODE_APP,
    UPLOAD_SERVING_MODE_REDIRECT,
    UPLOAD_SERVING_MODE_X_ACCEL,
}


def ensure_upload_root() -> Path:
    upload_root = Path(settings.UPLOAD_DIR)
    upload_root.mkdir(parents=True, exist_ok=True)
    return upload_root.resolve()


def write_upload_bytes(file_path: Path, content: bytes) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "wb") as file_obj:
        file_obj.write(content)


def validate_and_scan_image_bytes(content: bytes, *, allowed_formats: set[str]) -> None:
    validate_image_bytes(content, allowed_formats=allowed_formats)
    scan_bytes_for_malware(content)


def build_upload_response(file_path: str) -> Response:
    resolved_path, normalized_path = resolve_upload_path(file_path)
    media_type = mimetypes.guess_type(str(resolved_path))[0] or "application/octet-stream"

    if (
        settings.upload_serving_mode == UPLOAD_SERVING_MODE_REDIRECT
        and settings.UPLOADS_REDIRECT_BASE_URL
    ):
        target_url = f"{settings.UPLOADS_REDIRECT_BASE_URL.rstrip('/')}/{normalized_path}"
        response: Response = RedirectResponse(url=target_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    elif (
        settings.upload_serving_mode == UPLOAD_SERVING_MODE_X_ACCEL
        and settings.UPLOADS_ACCEL_REDIRECT_PREFIX
    ):
        accel_path = f"{settings.UPLOADS_ACCEL_REDIRECT_PREFIX.rstrip('/')}/{normalized_path}"
        response = Response(status_code=status.HTTP_200_OK, media_type=media_type)
        response.headers["X-Accel-Redirect"] = accel_path
    else:
        response = FileResponse(path=resolved_path, media_type=media_type)

    apply_upload_cache_headers(response)
    return response


def apply_upload_cache_headers(response: Response) -> None:
    max_age = max(0, int(settings.UPLOADS_CACHE_CONTROL_SECONDS))
    if max_age > 0:
        response.headers.setdefault("Cache-Control", f"public, max-age={max_age}, immutable")
    else:
        response.headers.setdefault("Cache-Control", "public, max-age=0")


def resolve_upload_path(file_path: str) -> tuple[Path, str]:
    upload_root = ensure_upload_root()
    normalized = (file_path or "").strip().lstrip("/")
    requested_path = Path(normalized)
    if not normalized or requested_path.is_absolute():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    resolved_path = (upload_root / requested_path).resolve()
    try:
        resolved_path.relative_to(upload_root)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc

    if not resolved_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    normalized_path = resolved_path.relative_to(upload_root).as_posix()
    return resolved_path, normalized_path
