from types import SimpleNamespace

import pytest

from app.api.v1.endpoints import users as users_endpoint


class _FakeDB:
    def __init__(self) -> None:
        self.add_count = 0
        self.commit_count = 0
        self.refresh_count = 0

    def add(self, _obj) -> None:
        self.add_count += 1

    def commit(self) -> None:
        self.commit_count += 1

    def refresh(self, _obj) -> None:
        self.refresh_count += 1


@pytest.mark.asyncio
async def test_update_settings_persists_notification_and_language(monkeypatch):
    deactivate_calls = []

    def _capture_deactivate(_db, *, user_id: int, platform: str = "ios"):
        deactivate_calls.append((user_id, platform))
        return 1

    monkeypatch.setattr(
        users_endpoint.crud_push_device_token,
        "deactivate_all_user_tokens",
        _capture_deactivate,
    )

    db = _FakeDB()
    user = SimpleNamespace(id=101, push_notifications_enabled=True, preferred_language="en")
    payload = users_endpoint.UpdateSettingsRequest(notification_enabled=False, language="zh")

    result = await users_endpoint.update_settings(payload, current_user=user, db=db)

    assert user.push_notifications_enabled is False
    assert user.preferred_language == "zh"
    assert db.add_count == 1
    assert db.commit_count == 1
    assert db.refresh_count == 1
    assert deactivate_calls == [(101, "ios")]
    assert result["settings"]["notification_enabled"] is False
    assert result["settings"]["language"] == "zh"


@pytest.mark.asyncio
async def test_update_settings_keeps_existing_values_when_fields_omitted(monkeypatch):
    deactivate_calls = []

    def _capture_deactivate(_db, *, user_id: int, platform: str = "ios"):
        deactivate_calls.append((user_id, platform))
        return 1

    monkeypatch.setattr(
        users_endpoint.crud_push_device_token,
        "deactivate_all_user_tokens",
        _capture_deactivate,
    )

    db = _FakeDB()
    user = SimpleNamespace(id=102, push_notifications_enabled=True, preferred_language="en")
    payload = users_endpoint.UpdateSettingsRequest(notification_enabled=None, language=None)

    result = await users_endpoint.update_settings(payload, current_user=user, db=db)

    assert user.push_notifications_enabled is True
    assert user.preferred_language == "en"
    assert db.add_count == 1
    assert db.commit_count == 1
    assert db.refresh_count == 1
    assert deactivate_calls == []
    assert result["settings"]["notification_enabled"] is True
    assert result["settings"]["language"] == "en"
