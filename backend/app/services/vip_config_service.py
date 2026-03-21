"""
Cached VIP config loading helpers.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.vip_level import VIPLevelConfig
from app.services import cache_service

VIP_LEVELS_CACHE_KEY = "vip:levels:v1"
VIP_LEVELS_CACHE_TTL_SECONDS = 300


def load_vip_level_rows(db: Session) -> list[dict[str, Any]]:
    def _loader() -> list[dict[str, Any]]:
        try:
            rows = (
                db.query(VIPLevelConfig)
                .order_by(VIPLevelConfig.level.asc())
                .all()
            )
        except SQLAlchemyError:
            return []

        return [
            {
                "level": int(row.level),
                "min_spend": float(row.min_spend or 0),
                "min_visits": int(row.min_visits or 0),
                "benefit": str(row.benefit or ""),
                "is_active": bool(row.is_active),
            }
            for row in rows
        ]

    return cache_service.get_or_set_json(
        VIP_LEVELS_CACHE_KEY,
        ttl_seconds=VIP_LEVELS_CACHE_TTL_SECONDS,
        loader=_loader,
    )


def invalidate_vip_levels_cache() -> None:
    cache_service.delete(VIP_LEVELS_CACHE_KEY)
