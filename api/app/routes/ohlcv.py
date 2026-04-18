from __future__ import annotations

import time
from typing import Final

from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import Settings, load_settings
from app.models import Candle, ErrorResponse, OhlcvResponse
from app.services.cache import TTLCache
from app.services.data_source import (
    DataSource,
    DataSourceError,
    NotFoundError,
)

router = APIRouter()

ALLOWED_INTERVALS: Final[tuple[str, ...]] = (
    "1m", "2m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo",
)
ALLOWED_RANGES: Final[tuple[str, ...]] = (
    "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max",
)

# Rough allowed range per interval (days). `None` means "no practical limit".
RANGE_DAY_LIMITS: Final[dict[str, int | None]] = {
    "1m": 7,
    "2m": 60,
    "5m": 60,
    "15m": 60,
    "30m": 60,
    "1h": 730,
    "1d": None,
    "1wk": None,
    "1mo": None,
}

# Approximate "days" value for each yfinance period string.
RANGE_DAYS_APPROX: Final[dict[str, int]] = {
    "1d": 1,
    "5d": 5,
    "1mo": 31,
    "3mo": 93,
    "6mo": 186,
    "1y": 366,
    "2y": 732,
    "5y": 1830,
    "max": 10_000,  # treat "max" as very large
}


_data_source: DataSource | None = None
_cache: TTLCache | None = None
_cached_ttl: int | None = None


def _get_cache(settings: Settings) -> TTLCache:
    global _cache, _cached_ttl
    if _cache is None or _cached_ttl != settings.cache_ttl_seconds:
        _cache = TTLCache(ttl_seconds=settings.cache_ttl_seconds, max_size=256)
        _cached_ttl = settings.cache_ttl_seconds
    return _cache


def set_data_source(ds: DataSource) -> None:
    """Used by tests to inject a fake DataSource."""
    global _data_source
    _data_source = ds


def clear_cache() -> None:
    if _cache is not None:
        _cache.clear()


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message}},
    )


def _validate(symbol: str, interval: str, range_: str, max_range_days: int) -> None:
    if not symbol or not symbol.strip():
        raise _error(400, "invalid_symbol", "symbol must not be empty")
    if interval not in ALLOWED_INTERVALS:
        raise _error(
            400,
            "invalid_interval",
            f"interval must be one of: {','.join(ALLOWED_INTERVALS)}",
        )
    if range_ not in ALLOWED_RANGES:
        raise _error(
            400,
            "invalid_range",
            f"range must be one of: {','.join(ALLOWED_RANGES)}",
        )
    limit = RANGE_DAY_LIMITS.get(interval)
    if limit is not None:
        approx = RANGE_DAYS_APPROX[range_]
        # also honor MAX_RANGE_DAYS as an outer cap
        effective = min(limit, max_range_days) if max_range_days > 0 else limit
        if approx > effective:
            raise _error(
                400,
                "invalid_range_for_interval",
                f"range={range_} exceeds limit for interval={interval} (max ~{effective} days)",
            )


@router.get(
    "/ohlcv",
    response_model=OhlcvResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
def get_ohlcv(
    symbol: str = Query(..., min_length=1, max_length=32),
    interval: str = Query(...),
    range: str = Query("5d"),  # noqa: A002 - intentional query name
    settings: Settings = Depends(load_settings),
) -> OhlcvResponse:
    symbol_norm = symbol.strip()
    _validate(symbol_norm, interval, range, settings.max_range_days)

    cache = _get_cache(settings)
    key = (symbol_norm, interval, range)
    cached = cache.get(key)
    if cached is not None:
        return _build_response(symbol_norm, interval, range, cached)

    if _data_source is None:
        raise _error(500, "server_error", "data source not configured")

    try:
        candles, tz = _data_source.fetch_ohlcv(symbol_norm, interval, range)
    except NotFoundError as exc:
        raise _error(404, "not_found", str(exc)) from exc
    except DataSourceError as exc:
        raise _error(502, "upstream_error", str(exc)) from exc

    payload = {"candles": candles, "timezone": tz}
    cache.set(key, payload)
    return _build_response(symbol_norm, interval, range, payload)


def _build_response(
    symbol: str, interval: str, range_: str, payload: dict
) -> OhlcvResponse:
    return OhlcvResponse(
        symbol=symbol,
        interval=interval,
        range=range_,
        timezone=payload.get("timezone"),
        candles=[Candle(**c) for c in payload["candles"]],
        fetched_at=int(time.time()),
    )
