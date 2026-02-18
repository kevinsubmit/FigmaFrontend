"""VIP endpoints"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.vip_level import VIPLevelConfig
from app.schemas.vip import VipLevelItem, VipLevelsUpdateRequest, VipProgress, VipStatusResponse


router = APIRouter()


DEFAULT_VIP_LEVELS: List[VipLevelItem] = [
    VipLevelItem(level=0, min_spend=0, min_visits=0, benefit="Member Access"),
    VipLevelItem(level=1, min_spend=35, min_visits=1, benefit="Priority Service (No Waiting)"),
    VipLevelItem(level=2, min_spend=2000, min_visits=5, benefit="Free Nail Care Kit"),
    VipLevelItem(level=3, min_spend=5000, min_visits=15, benefit="5% Discount on Services"),
    VipLevelItem(level=4, min_spend=10000, min_visits=30, benefit="10% Discount on Services"),
    VipLevelItem(level=5, min_spend=20000, min_visits=50, benefit="15% Discount + Personal Assistant"),
    VipLevelItem(level=6, min_spend=35000, min_visits=80, benefit="18% Discount + Birthday Gift"),
    VipLevelItem(level=7, min_spend=50000, min_visits=120, benefit="20% Discount + Exclusive Events"),
    VipLevelItem(level=8, min_spend=80000, min_visits=180, benefit="25% Discount + Home Service"),
    VipLevelItem(level=9, min_spend=120000, min_visits=250, benefit="30% Discount + Quarterly Luxury Gift"),
    VipLevelItem(level=10, min_spend=200000, min_visits=350, benefit="40% Discount + Black Card Status"),
]


def _load_vip_levels(db: Session) -> List[VipLevelItem]:
    try:
        rows = (
            db.query(VIPLevelConfig)
            .order_by(VIPLevelConfig.level.asc())
            .all()
        )
    except SQLAlchemyError:
        return DEFAULT_VIP_LEVELS
    if not rows:
        return DEFAULT_VIP_LEVELS
    return [
        VipLevelItem(
            level=int(row.level),
            min_spend=float(row.min_spend or 0),
            min_visits=int(row.min_visits or 0),
            benefit=str(row.benefit or ""),
            is_active=bool(row.is_active),
        )
        for row in rows
    ]


def _resolve_current_level(total_spend: float, total_visits: int, levels: List[VipLevelItem]) -> VipLevelItem:
    active_levels = [item for item in levels if item.is_active]
    if not active_levels:
        return DEFAULT_VIP_LEVELS[0]
    current = active_levels[0]
    for level in active_levels:
        if total_spend >= level.min_spend and total_visits >= level.min_visits:
            current = level
    return current


def _validate_level_rules(levels: List[VipLevelItem]) -> None:
    if not levels:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one VIP level is required")
    sorted_levels = sorted(levels, key=lambda x: x.level)
    if sorted_levels[0].level != 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level 0 must exist")
    seen = set()
    prev_spend = -1.0
    prev_visits = -1
    for level in sorted_levels:
        if level.level in seen:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Duplicate level: {level.level}")
        seen.add(level.level)
        if level.min_spend < 0 or level.min_visits < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_spend/min_visits must be >= 0")
        if level.min_spend < prev_spend or level.min_visits < prev_visits:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Levels must be non-decreasing by min_spend and min_visits",
            )
        if not level.benefit.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Benefit is required for level {level.level}")
        prev_spend = level.min_spend
        prev_visits = level.min_visits


def _calc_progress(current_value: float, required_value: float) -> VipProgress:
    if required_value <= 0:
        return VipProgress(current=current_value, required=required_value, percent=100.0)
    return VipProgress(
        current=current_value,
        required=required_value,
        percent=max(0.0, min(100.0, (current_value / required_value) * 100.0)),
    )


@router.get("/levels", response_model=List[VipLevelItem])
def get_vip_levels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all VIP levels config.
    """
    _ = current_user
    return _load_vip_levels(db)


@router.get("/admin/levels", response_model=List[VipLevelItem])
def get_admin_vip_levels(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Get VIP level config for admin management."""
    _ = current_user
    return _load_vip_levels(db)


@router.put("/admin/levels", response_model=List[VipLevelItem])
def update_admin_vip_levels(
    payload: VipLevelsUpdateRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Bulk replace VIP level config (super admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can manage VIP config")

    normalized = [
        VipLevelItem(
            level=int(item.level),
            min_spend=round(float(item.min_spend), 2),
            min_visits=int(item.min_visits),
            benefit=item.benefit.strip(),
            is_active=bool(item.is_active),
        )
        for item in payload.levels
    ]
    normalized = sorted(normalized, key=lambda x: x.level)
    _validate_level_rules(normalized)

    try:
        existing_map = {int(row.level): row for row in db.query(VIPLevelConfig).all()}
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VIP config table is not ready. Please run database migration first.",
        )
    incoming_levels = {item.level for item in normalized}

    for item in normalized:
        row = existing_map.get(item.level)
        if row:
            row.min_spend = item.min_spend
            row.min_visits = item.min_visits
            row.benefit = item.benefit
            row.is_active = item.is_active
        else:
            db.add(
                VIPLevelConfig(
                    level=item.level,
                    min_spend=item.min_spend,
                    min_visits=item.min_visits,
                    benefit=item.benefit,
                    is_active=item.is_active,
                )
            )

    for level, row in existing_map.items():
        if level not in incoming_levels:
            db.delete(row)

    db.commit()
    return _load_vip_levels(db)


@router.get("/status", response_model=VipStatusResponse)
def get_vip_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current user's VIP status based on completed appointments.
    """
    levels = _load_vip_levels(db)
    completed_rows = (
        db.query(
            Appointment.order_amount,
            Appointment.final_paid_amount,
        )
        .filter(
            Appointment.user_id == current_user.id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
        .all()
    )

    total_visits = len(completed_rows)
    total_spend = 0.0
    for row in completed_rows:
        final_paid = float(row.final_paid_amount or 0)
        order_amount = float(row.order_amount or 0)
        total_spend += final_paid if final_paid > 0 else max(order_amount, 0)

    total_spend = round(total_spend, 2)
    current_level = _resolve_current_level(total_spend=total_spend, total_visits=total_visits, levels=levels)

    next_level = None
    for level in levels:
        if level.is_active and level.level > current_level.level:
            next_level = level
            break

    spend_required = next_level.min_spend if next_level else max(total_spend, 0.0)
    visits_required = float(next_level.min_visits) if next_level else float(max(total_visits, 0))

    return VipStatusResponse(
        current_level=current_level,
        total_spend=total_spend,
        total_visits=total_visits,
        spend_progress=_calc_progress(total_spend, spend_required),
        visits_progress=_calc_progress(float(total_visits), visits_required),
        next_level=next_level,
    )
