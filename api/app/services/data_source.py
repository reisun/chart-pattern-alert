from __future__ import annotations

import io
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Protocol, TypedDict

import httpx
import pandas as pd
import yfinance as yf

logger = logging.getLogger("app.data_source")


class Candle(TypedDict):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class DataSourceError(Exception):
    """Upstream data source failed (network, parse, etc.)."""


class NotFoundError(Exception):
    """Upstream returned empty result for the given query."""


class DataSource(Protocol):
    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        """Return (candles, timezone_name)."""


class YFinanceDataSource:
    """yfinance-backed implementation.

    Uses yf.Ticker(symbol).history(period, interval) and normalizes the DataFrame.
    """

    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=range_, interval=interval, auto_adjust=False)
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("yfinance fetch failed: symbol=%s err=%s", symbol, exc)
            raise DataSourceError(str(exc)) from exc

        if df is None or df.empty:
            raise NotFoundError(f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}")

        df = df.dropna(subset=["Open", "High", "Low", "Close"])
        if df.empty:
            raise NotFoundError(f"no valid rows for symbol={symbol!r}")

        tz_name: str | None = None
        if isinstance(df.index, pd.DatetimeIndex) and df.index.tz is not None:
            tz_name = str(df.index.tz)

        candles: list[Candle] = []
        for ts, row in df.iterrows():
            utc_ts = _to_utc_epoch(ts)
            vol_raw = row.get("Volume", 0)
            volume = 0 if (vol_raw is None or (isinstance(vol_raw, float) and math.isnan(vol_raw))) else int(vol_raw)
            candles.append(
                Candle(
                    time=utc_ts,
                    open=float(row["Open"]),
                    high=float(row["High"]),
                    low=float(row["Low"]),
                    close=float(row["Close"]),
                    volume=volume,
                )
            )

        candles.sort(key=lambda c: c["time"])
        logger.info(
            "yfinance ok: symbol=%s interval=%s range=%s rows=%d tz=%s",
            symbol, interval, range_, len(candles), tz_name,
        )
        return candles, tz_name


def _to_utc_epoch(ts: pd.Timestamp) -> int:
    if ts.tzinfo is None:
        ts = ts.tz_localize("UTC")
    else:
        ts = ts.tz_convert("UTC")
    return int(ts.timestamp())


# ---- Stooq interval / range mappings ----

_STOOQ_INTERVAL_MAP: dict[str, str] = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "1d": "d",
    "1wk": "w",
    "1mo": "m",
}

_RANGE_DELTA: dict[str, timedelta | None] = {
    "1d": timedelta(days=1),
    "5d": timedelta(days=5),
    "1mo": timedelta(days=31),
    "3mo": timedelta(days=93),
    "6mo": timedelta(days=186),
    "1y": timedelta(days=366),
    "2y": timedelta(days=732),
    "5y": timedelta(days=1830),
    "max": None,  # special-cased
}


class StooqDataSource:
    """Stooq CSV-based implementation.

    URL pattern:
      https://stooq.com/q/d/l/?s={symbol}.US&d1={YYYYMMDD}&d2={YYYYMMDD}&i={interval}

    Requires STOOQ_API_KEY environment variable if Stooq enforces API keys.
    """

    _BASE_URL = "https://stooq.com/q/d/l/"

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("STOOQ_API_KEY", "")

    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        stooq_interval = _STOOQ_INTERVAL_MAP.get(interval)
        if stooq_interval is None:
            raise DataSourceError(f"unsupported interval for Stooq: {interval!r}")

        today = datetime.now(timezone.utc).date()
        delta = _RANGE_DELTA.get(range_)
        if delta is None and range_ == "max":
            start_date = "19000101"
        elif delta is not None:
            start_date = (today - delta).strftime("%Y%m%d")
        else:
            raise DataSourceError(f"unsupported range for Stooq: {range_!r}")
        end_date = today.strftime("%Y%m%d")

        stooq_symbol = f"{symbol}.US"
        params: dict[str, str] = {
            "s": stooq_symbol,
            "d1": start_date,
            "d2": end_date,
            "i": stooq_interval,
        }
        if self._api_key:
            params["apikey"] = self._api_key

        try:
            resp = httpx.get(self._BASE_URL, params=params, timeout=30.0)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Stooq fetch failed: symbol=%s err=%s", symbol, exc)
            raise DataSourceError(str(exc)) from exc

        text = resp.text.strip()
        if not text or "No data" in text:
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )

        # Stooq returns a plaintext message when API key is missing/invalid
        if "apikey" in text.lower() or "captcha" in text.lower():
            raise DataSourceError(
                "Stooq requires a valid API key. Set STOOQ_API_KEY environment variable."
            )

        try:
            df = pd.read_csv(io.StringIO(text))
        except Exception as exc:
            raise DataSourceError(f"CSV parse error: {exc}") from exc

        if df.empty:
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )

        # Normalize column names (Stooq may return Title-cased columns)
        df.columns = [c.strip().title() for c in df.columns]

        required = {"Date", "Open", "High", "Low", "Close"}
        if not required.issubset(set(df.columns)):
            raise DataSourceError(
                f"unexpected CSV columns: {list(df.columns)}"
            )

        df = df.dropna(subset=["Open", "High", "Low", "Close"])
        if df.empty:
            raise NotFoundError(f"no valid rows for symbol={symbol!r}")

        candles: list[Candle] = []
        for _, row in df.iterrows():
            ts = pd.Timestamp(str(row["Date"]))
            utc_ts = _to_utc_epoch(ts)
            vol_raw = row.get("Volume", 0)
            volume = 0 if (
                vol_raw is None
                or (isinstance(vol_raw, float) and math.isnan(vol_raw))
            ) else int(vol_raw)
            candles.append(
                Candle(
                    time=utc_ts,
                    open=float(row["Open"]),
                    high=float(row["High"]),
                    low=float(row["Low"]),
                    close=float(row["Close"]),
                    volume=volume,
                )
            )

        candles.sort(key=lambda c: c["time"])
        logger.info(
            "stooq ok: symbol=%s interval=%s range=%s rows=%d",
            symbol, interval, range_, len(candles),
        )
        return candles, None  # Stooq returns UTC, no tz info


def create_data_source(name: str) -> DataSource:
    """Factory: create a DataSource by name."""
    if name == "stooq":
        return StooqDataSource()
    if name == "yfinance":
        return YFinanceDataSource()
    raise ValueError(f"unknown data source: {name!r}")
