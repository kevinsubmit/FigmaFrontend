import re

import pytest
from fastapi.testclient import TestClient

import app.main as main_module


class _DummyDB:
    def close(self) -> None:
        return None


def _ensure_error_route() -> None:
    if any(getattr(route, "path", None) == "/_test/raise" for route in main_module.app.routes):
        return

    def _raise_runtime_error() -> None:
        raise RuntimeError("boom")

    main_module.app.add_api_route(
        "/_test/raise",
        _raise_runtime_error,
        methods=["GET"],
        include_in_schema=False,
    )


@pytest.fixture
def _patched_logging(monkeypatch):
    sync_log_calls: list[dict] = []
    async_log_calls: list[dict] = []

    monkeypatch.setattr(main_module, "SessionLocal", lambda: _DummyDB())
    monkeypatch.setattr(main_module, "_ACCESS_LOG_SAMPLE_RATE", 1.0)

    def _capture_sync_log(*_args, **kwargs):
        sync_log_calls.append(kwargs)

    def _capture_async_log(**kwargs):
        async_log_calls.append(kwargs)
        return True

    monkeypatch.setattr(main_module.log_service, "create_system_log", _capture_sync_log)
    monkeypatch.setattr(main_module.log_service, "create_system_log_async", _capture_async_log)

    return {"sync": sync_log_calls, "async": async_log_calls}


def test_valid_request_id_is_preserved(_patched_logging):
    request_id = "web-h5-trace-1234"
    with TestClient(main_module.app) as client:
        response = client.get(
            "/health",
            headers={
                "X-Request-Id": request_id,
                "X-Client-Platform": "web-h5",
                "X-Client-Version": "1.2.3",
            },
        )

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == request_id
    assert _patched_logging["async"]
    assert _patched_logging["async"][-1]["request_id"] == request_id
    assert _patched_logging["async"][-1]["meta"]["client_platform"] == "web-h5"
    assert _patched_logging["async"][-1]["meta"]["client_version"] == "1.2.3"


def test_invalid_request_id_falls_back_to_generated_id(_patched_logging):
    with TestClient(main_module.app) as client:
        response = client.get("/health", headers={"X-Request-Id": "bad\nid"})

    assert response.status_code == 200
    returned_id = response.headers.get("x-request-id")
    assert returned_id is not None
    assert re.fullmatch(r"[0-9a-f]{32}", returned_id)
    assert _patched_logging["async"][-1]["request_id"] == returned_id


def test_invalid_platform_header_is_dropped_from_log_meta(_patched_logging):
    with TestClient(main_module.app) as client:
        response = client.get(
            "/health",
            headers={
                "X-Client-Platform": "web h5",
                "X-Client-Version": "v1.0\r\nbuild42",
            },
        )

    assert response.status_code == 200
    meta = _patched_logging["async"][-1]["meta"]
    assert "client_platform" not in meta
    assert meta["client_version"] == "v1.0build42"


def test_500_response_contains_request_id_in_header_and_body(_patched_logging):
    _ensure_error_route()
    request_id = "trace-500-case"

    with TestClient(main_module.app, raise_server_exceptions=False) as client:
        response = client.get("/_test/raise", headers={"X-Request-Id": request_id})

    assert response.status_code == 500
    assert response.headers.get("x-request-id") == request_id
    payload = response.json()
    assert payload["detail"] == "Internal server error"
    assert payload["request_id"] == request_id
    assert _patched_logging["sync"][-1]["request_id"] == request_id
    assert _patched_logging["sync"][-1]["status_code"] == 500
