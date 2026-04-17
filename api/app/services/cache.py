from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Any, Hashable


class TTLCache:
    """Simple thread-safe in-memory TTL cache with LRU eviction.

    - key: any hashable
    - value: any
    - ttl: per-instance default (seconds), based on time.monotonic()
    - max_size: evicts oldest (insertion-order) entry on overflow
    """

    def __init__(self, ttl_seconds: int, max_size: int = 256) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be > 0")
        if max_size <= 0:
            raise ValueError("max_size must be > 0")
        self._ttl = ttl_seconds
        self._max = max_size
        self._data: OrderedDict[Hashable, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> Any | None:
        now = time.monotonic()
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at < now:
                # expired
                self._data.pop(key, None)
                return None
            # refresh LRU order
            self._data.move_to_end(key)
            return value

    def set(self, key: Hashable, value: Any) -> None:
        expires_at = time.monotonic() + self._ttl
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
            self._data[key] = (expires_at, value)
            while len(self._data) > self._max:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._data)
