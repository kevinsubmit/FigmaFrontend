"""
Lightweight read-cache service.

Uses Redis when available and falls back to in-process TTL memory cache.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Callable, Optional, TypeVar

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

_CACHE_KEY_PREFIX = "nailsdash:cache:"
_LOCAL_CACHE_LOCK = threading.Lock()
_LOCAL_CACHE: dict[str, tuple[float, str]] = {}
_REDIS_LOCK = threading.Lock()
_REDIS_CLIENT: Optional[Redis] = None
_REDIS_DISABLED_UNTIL = 0.0
_REDIS_RETRY_SECONDS = 30.0


def _cache_key(key: str) -> str:
    return f"{_CACHE_KEY_PREFIX}{key}"


def _get_redis_client() -> Optional[Redis]:
    global _REDIS_CLIENT, _REDIS_DISABLED_UNTIL
    if time.time() < _REDIS_DISABLED_UNTIL:
        return None
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    with _REDIS_LOCK:
        if _REDIS_CLIENT is not None:
            return _REDIS_CLIENT
        try:
            _REDIS_CLIENT = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2,
                health_check_interval=30,
            )
        except Exception:
            logger.warning("Failed to initialize Redis cache client", exc_info=True)
            _REDIS_CLIENT = None
            _REDIS_DISABLED_UNTIL = time.time() + _REDIS_RETRY_SECONDS
        return _REDIS_CLIENT


def _disable_redis_temporarily() -> None:
    global _REDIS_CLIENT, _REDIS_DISABLED_UNTIL
    with _REDIS_LOCK:
        _REDIS_CLIENT = None
        _REDIS_DISABLED_UNTIL = time.time() + _REDIS_RETRY_SECONDS


def _serialize(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _deserialize(value: str) -> Any:
    return json.loads(value)


def _get_local(key: str) -> Any | None:
    now = time.time()
    with _LOCAL_CACHE_LOCK:
        entry = _LOCAL_CACHE.get(key)
        if not entry:
            return None
        expires_at, payload = entry
        if expires_at <= now:
            _LOCAL_CACHE.pop(key, None)
            return None
    try:
        return _deserialize(payload)
    except Exception:
        with _LOCAL_CACHE_LOCK:
            _LOCAL_CACHE.pop(key, None)
        return None


def _set_local(key: str, value: Any, ttl_seconds: float) -> None:
    payload = _serialize(value)
    with _LOCAL_CACHE_LOCK:
        _LOCAL_CACHE[key] = (time.time() + ttl_seconds, payload)


def get_json(key: str) -> Any | None:
    cache_key = _cache_key(key)
    client = _get_redis_client()
    if client is not None:
        try:
            payload = client.get(cache_key)
            if payload is not None:
                return _deserialize(payload)
        except RedisError:
            logger.warning("Redis cache get failed for key=%s", key, exc_info=True)
            _disable_redis_temporarily()
    return _get_local(cache_key)


def set_json(key: str, value: Any, ttl_seconds: float) -> None:
    cache_key = _cache_key(key)
    _set_local(cache_key, value, ttl_seconds)

    client = _get_redis_client()
    if client is not None:
        try:
            client.setex(cache_key, max(1, int(ttl_seconds)), _serialize(value))
        except RedisError:
            logger.warning("Redis cache set failed for key=%s", key, exc_info=True)
            _disable_redis_temporarily()


def delete(key: str) -> None:
    cache_key = _cache_key(key)
    with _LOCAL_CACHE_LOCK:
        _LOCAL_CACHE.pop(cache_key, None)

    client = _get_redis_client()
    if client is not None:
        try:
            client.delete(cache_key)
        except RedisError:
            logger.warning("Redis cache delete failed for key=%s", key, exc_info=True)
            _disable_redis_temporarily()


def delete_many(keys: list[str]) -> None:
    for key in keys:
        delete(key)


def get_or_set_json(key: str, ttl_seconds: float, loader: Callable[[], T]) -> T:
    cached = get_json(key)
    if cached is not None:
        return cached

    value = loader()
    set_json(key, value, ttl_seconds)
    return value
