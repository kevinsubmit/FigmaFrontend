"""
Service commission rules regression script.

Run:
    python test_service_commission_modes.py
"""

from app.crud.service import _normalize_commission_payload
from app.models.service import Service
from app.api.v1.endpoints.technicians import (
    _calculate_commission_by_amount,
    _calculate_split_commission,
    _calculate_items_commission,
)


def test_normalize_payload() -> None:
    # Legacy payload: only commission_amount from old client.
    commission_type, commission_value, commission_amount = _normalize_commission_payload(
        commission_type=None,
        commission_value=None,
        commission_amount=25,
    )
    assert commission_type == Service.COMMISSION_TYPE_FIXED
    assert commission_value == 25
    assert commission_amount == 25

    # Percent payload.
    commission_type, commission_value, commission_amount = _normalize_commission_payload(
        commission_type="percent",
        commission_value=20,
        commission_amount=None,
    )
    assert commission_type == Service.COMMISSION_TYPE_PERCENT
    assert commission_value == 20
    assert commission_amount == 0

    # Percent cannot exceed 100.
    try:
        _normalize_commission_payload(
            commission_type="percent",
            commission_value=120,
            commission_amount=None,
        )
        raise AssertionError("Expected ValueError for percent > 100")
    except ValueError:
        pass


def test_commission_calculation() -> None:
    # Fixed commission for unsplit order.
    assert _calculate_commission_by_amount(80, Service.COMMISSION_TYPE_FIXED, 15) == 15
    # Percent commission for unsplit order.
    assert _calculate_commission_by_amount(80, Service.COMMISSION_TYPE_PERCENT, 20) == 16

    # Fixed commission split by amount share.
    split_fixed = _calculate_split_commission(
        split_amount=20,
        service_total=50,
        commission_type=Service.COMMISSION_TYPE_FIXED,
        commission_value=10,
    )
    assert round(split_fixed, 2) == 4.0

    # Percent commission split by split amount directly.
    split_percent = _calculate_split_commission(
        split_amount=20,
        service_total=50,
        commission_type=Service.COMMISSION_TYPE_PERCENT,
        commission_value=20,
    )
    assert round(split_percent, 2) == 4.0

    # Multi-service unsplit appointment by actual service amounts.
    total = _calculate_items_commission(
        items=[(101, 30.0), (102, 20.0)],
        service_commission_map={
            101: (Service.COMMISSION_TYPE_PERCENT, 20.0),  # 6
            102: (Service.COMMISSION_TYPE_FIXED, 5.0),  # 5
        },
    )
    assert round(total, 2) == 11.0


def main() -> None:
    test_normalize_payload()
    test_commission_calculation()
    print("OK: service commission rules regression passed")


if __name__ == "__main__":
    main()
