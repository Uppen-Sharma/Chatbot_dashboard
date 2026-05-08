"""
In-Memory TTL Response Cache
=============================
A lightweight, zero-dependency caching layer for async service functions.

Design:
  - Cache store is a plain dict: { cache_key -> (result, expires_at_epoch) }
  - Cache keys are built from the function name + serialized arguments,
    so different date ranges produce different entries automatically.
  - Entries expire lazily: they are evicted on the next read after TTL elapses.
  - No external packages required (stdlib only: time, hashlib, json, functools).

Usage:
    from src.core.cache import cached

    @cached(ttl_seconds=300)
    async def my_service_fn(arg1, arg2, db):
        ...

    # Force-clear the entire cache (e.g. after a mutation):
    from src.core.cache import cache_store
    cache_store.clear()
"""

import time
import json
import hashlib
import functools
from typing import Any, Callable, Dict, Tuple

# Module-level store: { key: (result, expires_at) }
cache_store: Dict[str, Tuple[Any, float]] = {}


def _make_key(fn_name: str, args: tuple, kwargs: dict) -> str:
    """Build a stable, unique cache key from function name + arguments.

    SQLAlchemy AsyncSession objects (the `db` dependency) are skipped because
    they are not serialisable and differ per-request — they must never form
    part of the cache key.
    """
    serialisable_args = [
        a for a in args
        if isinstance(a, (str, int, float, bool, type(None)))
    ]
    serialisable_kwargs = {
        k: v for k, v in kwargs.items()
        if isinstance(v, (str, int, float, bool, type(None)))
    }
    payload = json.dumps(
        {"fn": fn_name, "args": serialisable_args, "kwargs": serialisable_kwargs},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def cached(ttl_seconds: int = 300):
    """Decorator that caches the return value of an async function for `ttl_seconds`.

    Args:
        ttl_seconds: How many seconds to keep the cached result alive.
                     Default: 300 s (5 minutes).

    Example:
        @cached(ttl_seconds=120)
        async def get_stats(start, end, db):
            ...
    """
    def decorator(fn: Callable):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            key = _make_key(fn.__name__, args, kwargs)
            now = time.monotonic()

            # Return cached value if still fresh
            if key in cache_store:
                result, expires_at, _ = cache_store[key]
                if now < expires_at:
                    return result
                # Expired — evict it
                del cache_store[key]

            # Execute the real function and cache its result
            result = await fn(*args, **kwargs)
            cache_store[key] = (result, now + ttl_seconds, fn.__name__)
            return result

        # Expose a manual invalidation helper on the wrapper itself
        def invalidate():
            """Clear only entries belonging to this function from the cache."""
            fn_name = fn.__name__
            keys_to_delete = [
                k for k, (_, _, owner) in list(cache_store.items())
                if owner == fn_name
            ]
            for k in keys_to_delete:
                cache_store.pop(k, None)

        wrapper.invalidate = invalidate  # type: ignore[attr-defined]
        return wrapper

    return decorator