from __future__ import annotations

import time

import pytest

from app.services.cache import TTLCache


def test_set_and_get():
    c = TTLCache(ttl_seconds=10, max_size=4)
    c.set("k", "v")
    assert c.get("k") == "v"


def test_miss_returns_none():
    c = TTLCache(ttl_seconds=10)
    assert c.get("nope") is None


def test_expiry(monkeypatch):
    base = 1000.0

    class Clock:
        now = base

    def fake_monotonic() -> float:
        return Clock.now

    # patch monotonic inside the cache module only
    import app.services.cache as cache_mod

    monkeypatch.setattr(cache_mod.time, "monotonic", fake_monotonic)
    c = cache_mod.TTLCache(ttl_seconds=5)
    c.set("k", "v")
    Clock.now = base + 4.9
    assert c.get("k") == "v"
    Clock.now = base + 5.1
    assert c.get("k") is None


def test_lru_eviction():
    c = TTLCache(ttl_seconds=100, max_size=2)
    c.set("a", 1)
    c.set("b", 2)
    c.set("c", 3)  # evicts "a"
    assert c.get("a") is None
    assert c.get("b") == 2
    assert c.get("c") == 3


def test_rejects_invalid_params():
    with pytest.raises(ValueError):
        TTLCache(ttl_seconds=0)
    with pytest.raises(ValueError):
        TTLCache(ttl_seconds=10, max_size=0)


def test_access_refreshes_lru_order():
    c = TTLCache(ttl_seconds=100, max_size=2)
    c.set("a", 1)
    c.set("b", 2)
    # touch "a" so it becomes most-recent
    _ = c.get("a")
    c.set("c", 3)  # should evict "b", not "a"
    assert c.get("a") == 1
    assert c.get("b") is None
    assert c.get("c") == 3
