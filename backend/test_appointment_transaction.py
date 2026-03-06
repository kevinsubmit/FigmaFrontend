from datetime import date, time

from app.crud import appointment as appointment_crud
from app.schemas.appointment import AppointmentCreate


class _FakeSession:
    def __init__(self) -> None:
        self.commit_count = 0
        self.refresh_count = 0
        self.flush_count = 0
        self._added = []
        self._next_id = 321

    def add(self, obj) -> None:
        self._added.append(obj)

    def flush(self) -> None:
        self.flush_count += 1
        for obj in self._added:
            if getattr(obj, "id", None) is None:
                obj.id = self._next_id

    def commit(self) -> None:
        self.commit_count += 1

    def refresh(self, _obj) -> None:
        self.refresh_count += 1


def _sample_create_payload() -> AppointmentCreate:
    return AppointmentCreate(
        store_id=1,
        service_id=2,
        technician_id=3,
        appointment_date=date(2026, 3, 10),
        appointment_time=time(10, 30),
        notes="test",
    )


def test_create_appointment_auto_commit_disabled() -> None:
    db = _FakeSession()
    appointment = appointment_crud.create_appointment(
        db,
        appointment=_sample_create_payload(),
        user_id=9,
        auto_commit=False,
    )

    assert appointment.id == 321
    assert appointment.order_number is not None
    assert appointment.order_number.startswith("ORD")
    assert appointment.order_number.endswith("000321")
    assert db.commit_count == 0
    assert db.refresh_count == 0
    assert db.flush_count >= 2


def test_create_appointment_auto_commit_enabled() -> None:
    db = _FakeSession()
    appointment = appointment_crud.create_appointment(
        db,
        appointment=_sample_create_payload(),
        user_id=9,
    )

    assert appointment.id == 321
    assert appointment.order_number is not None
    assert appointment.order_number.startswith("ORD")
    assert appointment.order_number.endswith("000321")
    assert db.commit_count == 1
    assert db.refresh_count == 1
    assert db.flush_count >= 2
