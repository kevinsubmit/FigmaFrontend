from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints import appointments as appointments_endpoint
from app.schemas.store import StoreCreate, StoreUpdate


def test_store_schema_accepts_valid_time_zone() -> None:
    payload = StoreCreate(
        name="TZ Store",
        address="1 Main St",
        city="Los Angeles",
        state="CA",
        time_zone="America/Los_Angeles",
    )
    assert payload.time_zone == "America/Los_Angeles"


def test_store_schema_rejects_invalid_time_zone() -> None:
    with pytest.raises(ValidationError):
        StoreCreate(
            name="Bad TZ Store",
            address="1 Main St",
            city="LA",
            state="CA",
            time_zone="Mars/OlympusMons",
        )

    with pytest.raises(ValidationError):
        StoreUpdate(time_zone="")


def test_not_past_appointment_uses_store_timezone() -> None:
    store_tz = ZoneInfo("America/Los_Angeles")
    now_in_store_tz = datetime.now(store_tz)

    future = now_in_store_tz + timedelta(hours=2)
    appointments_endpoint._ensure_not_past_appointment(
        future.date(),
        future.time().replace(second=0, microsecond=0),
        store_timezone=store_tz,
    )

    past = now_in_store_tz - timedelta(hours=2)
    with pytest.raises(HTTPException) as exc:
        appointments_endpoint._ensure_not_past_appointment(
            past.date(),
            past.time().replace(second=0, microsecond=0),
            store_timezone=store_tz,
        )
    assert exc.value.status_code == 400
