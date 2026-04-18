from __future__ import annotations

import os
from dataclasses import dataclass


def _parse_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]
    cache_ttl_seconds: int
    max_range_days: int
    data_source: str


def load_settings() -> Settings:
    return Settings(
        cors_origins=_parse_origins(
            os.getenv("CORS_ORIGINS", "https://reisun.github.io,http://localhost:5173")
        ),
        cache_ttl_seconds=int(os.getenv("CACHE_TTL_SECONDS", "300")),
        max_range_days=int(os.getenv("MAX_RANGE_DAYS", "60")),
        data_source=os.getenv("DATA_SOURCE", "yfinance"),
    )
