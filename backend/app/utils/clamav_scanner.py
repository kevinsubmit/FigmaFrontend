"""
Optional ClamAV scanner for upload hardening.
"""
from __future__ import annotations

import logging
import socket
import struct

from app.core.config import settings

logger = logging.getLogger(__name__)


CHUNK_SIZE = 1024 * 1024


def _scan_bytes_with_clamd(content: bytes) -> str:
    """
    Scan bytes via clamd INSTREAM protocol.
    Returns raw clamd response.
    """
    with socket.create_connection(
        (settings.CLAMAV_HOST, settings.CLAMAV_PORT),
        timeout=settings.CLAMAV_TIMEOUT_SECONDS,
    ) as sock:
        sock.sendall(b"zINSTREAM\0")
        for i in range(0, len(content), CHUNK_SIZE):
            chunk = content[i : i + CHUNK_SIZE]
            sock.sendall(struct.pack(">I", len(chunk)))
            sock.sendall(chunk)
        sock.sendall(struct.pack(">I", 0))

        response_chunks = []
        while True:
            data = sock.recv(4096)
            if not data:
                break
            response_chunks.append(data)
    return b"".join(response_chunks).decode("utf-8", errors="replace").strip()


def scan_bytes_for_malware(content: bytes) -> None:
    """
    Raise ValueError if malware is found or scanner is unavailable (fail-closed mode).
    """
    if not settings.SECURITY_ENABLE_CLAMAV:
        return

    try:
        result = _scan_bytes_with_clamd(content)
    except Exception as exc:
        logger.warning("ClamAV scan unavailable: %s", exc)
        if settings.SECURITY_SCAN_FAIL_CLOSED:
            raise ValueError("Security scan unavailable, upload rejected") from exc
        return

    if "FOUND" in result.upper():
        raise ValueError("Malicious file detected")
    if "OK" in result.upper():
        return
    logger.warning("Unexpected ClamAV response: %s", result)
    if settings.SECURITY_SCAN_FAIL_CLOSED:
        raise ValueError("Security scan failed, upload rejected")
