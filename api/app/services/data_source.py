from __future__ import annotations

import io
import logging
import math
import os
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


# ---- Alpha Vantage interval mappings ----

_AV_INTRADAY_INTERVAL_MAP: dict[str, str] = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "60min",
}

_AV_NON_INTRADAY_FUNCTION: dict[str, str] = {
    "1d": "TIME_SERIES_DAILY",
    "1wk": "TIME_SERIES_WEEKLY",
    "1mo": "TIME_SERIES_MONTHLY",
}


class AlphaVantageDataSource:
    """Alpha Vantage CSV-based implementation.

    Uses the free-tier CSV endpoint (datatype=csv).
    Requires ALPHA_VANTAGE_API_KEY environment variable.
    """

    _BASE_URL = "https://www.alphavantage.co/query"

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("ALPHA_VANTAGE_API_KEY", "")

    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        if not self._api_key:
            raise DataSourceError(
                "Alpha Vantage API key is not set. "
                "Set ALPHA_VANTAGE_API_KEY environment variable."
            )

        intraday_interval = _AV_INTRADAY_INTERVAL_MAP.get(interval)
        non_intraday_func = _AV_NON_INTRADAY_FUNCTION.get(interval)

        if intraday_interval is None and non_intraday_func is None:
            raise DataSourceError(f"unsupported interval for Alpha Vantage: {interval!r}")

        outputsize = "full" if range_ == "max" else "compact"

        params: dict[str, str] = {
            "symbol": symbol,
            "apikey": self._api_key,
            "datatype": "csv",
        }

        if intraday_interval is not None:
            params["function"] = "TIME_SERIES_INTRADAY"
            params["interval"] = intraday_interval
            params["outputsize"] = outputsize
        else:
            assert non_intraday_func is not None
            params["function"] = non_intraday_func
            params["outputsize"] = outputsize

        try:
            resp = httpx.get(self._BASE_URL, params=params, timeout=30.0)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Alpha Vantage fetch failed: symbol=%s err=%s", symbol, exc)
            raise DataSourceError(str(exc)) from exc

        text = resp.text.strip()

        # Alpha Vantage returns JSON error messages even when datatype=csv
        if text.startswith("{"):
            self._check_json_error(text)

        if not text:
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )

        try:
            df = pd.read_csv(io.StringIO(text))
        except Exception as exc:
            raise DataSourceError(f"CSV parse error: {exc}") from exc

        if df.empty:
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )

        # Normalize column names to title case
        df.columns = [c.strip().title() for c in df.columns]

        required = {"Timestamp", "Open", "High", "Low", "Close"}
        if not required.issubset(set(df.columns)):
            raise DataSourceError(
                f"unexpected CSV columns: {list(df.columns)}"
            )

        df = df.dropna(subset=["Open", "High", "Low", "Close"])
        if df.empty:
            raise NotFoundError(f"no valid rows for symbol={symbol!r}")

        candles: list[Candle] = []
        for _, row in df.iterrows():
            ts = pd.Timestamp(str(row["Timestamp"]))
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
            "alphavantage ok: symbol=%s interval=%s range=%s rows=%d",
            symbol, interval, range_, len(candles),
        )
        return candles, None  # Alpha Vantage CSV timestamps are exchange-local, no tz info

    def _check_json_error(self, text: str) -> None:
        """Detect JSON error responses from Alpha Vantage."""
        import json
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return  # Not JSON, let CSV parser handle it

        if "Error Message" in data:
            raise DataSourceError(f"Alpha Vantage error: {data['Error Message']}")
        if "Note" in data:
            raise DataSourceError(f"Alpha Vantage rate limit: {data['Note']}")
        if "Information" in data:
            raise DataSourceError(f"Alpha Vantage rate limit: {data['Information']}")


def create_data_source(name: str) -> DataSource:
    """Factory: create a DataSource by name."""
    if name == "alphavantage":
        return AlphaVantageDataSource()
    if name == "yfinance":
        return YFinanceDataSource()
    raise ValueError(f"unknown data source: {name!r}")
