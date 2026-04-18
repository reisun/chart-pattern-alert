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


# ---- Finnhub mappings ----

_FINNHUB_RESOLUTION_MAP: dict[str, str] = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "1d": "D",
    "1wk": "W",
    "1mo": "M",
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
    "max": None,  # special-cased to 2000-01-01
}


class FinnhubDataSource:
    """Finnhub Stock Candles API implementation.

    Uses JSON endpoint: GET /api/v1/stock/candle
    Requires FINNHUB_API_KEY environment variable.
    """

    _BASE_URL = "https://finnhub.io/api/v1/stock/candle"

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("FINNHUB_API_KEY", "")

    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        if not self._api_key:
            raise DataSourceError(
                "Finnhub API key is not set. "
                "Set FINNHUB_API_KEY environment variable."
            )

        resolution = _FINNHUB_RESOLUTION_MAP.get(interval)
        if resolution is None:
            raise DataSourceError(f"unsupported interval for Finnhub: {interval!r}")

        now = datetime.now(timezone.utc)
        delta = _RANGE_DELTA.get(range_)
        if delta is None and range_ == "max":
            from_dt = datetime(2000, 1, 1, tzinfo=timezone.utc)
        elif delta is not None:
            from_dt = now - delta
        else:
            raise DataSourceError(f"unsupported range for Finnhub: {range_!r}")

        params: dict[str, str] = {
            "symbol": symbol,
            "resolution": resolution,
            "from": str(int(from_dt.timestamp())),
            "to": str(int(now.timestamp())),
            "token": self._api_key,
        }

        try:
            resp = httpx.get(self._BASE_URL, params=params, timeout=30.0)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Finnhub fetch failed: symbol=%s err=%s", symbol, exc)
            raise DataSourceError(str(exc)) from exc

        data = resp.json()
        status = data.get("s")
        if status == "no_data":
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )
        if status != "ok":
            raise DataSourceError(f"Finnhub returned status={status!r}")

        opens = data.get("o", [])
        highs = data.get("h", [])
        lows = data.get("l", [])
        closes = data.get("c", [])
        volumes = data.get("v", [])
        timestamps = data.get("t", [])

        candles: list[Candle] = []
        for o, h, l, c, v, t in zip(opens, highs, lows, closes, volumes, timestamps):
            candles.append(
                Candle(
                    time=int(t),
                    open=float(o),
                    high=float(h),
                    low=float(l),
                    close=float(c),
                    volume=int(v) if v is not None else 0,
                )
            )

        candles.sort(key=lambda c: c["time"])
        logger.info(
            "finnhub ok: symbol=%s interval=%s range=%s rows=%d",
            symbol, interval, range_, len(candles),
        )
        return candles, None



# ---- TwelveData mappings ----

_TD_INTERVAL_MAP: dict[str, str] = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "1d": "1day",
    "1wk": "1week",
    "1mo": "1month",
}

_RANGE_OUTPUTSIZE: dict[str, int] = {
    "1d": 100,
    "5d": 500,
    "1mo": 1000,
    "3mo": 2000,
    "6mo": 3000,
    "1y": 5000,
    "2y": 5000,
    "5y": 5000,
    "max": 5000,
}


class TwelveDataDataSource:
    """TwelveData Time Series API implementation.

    Uses JSON endpoint: GET /time_series
    Requires TWELVE_DATA_API_KEY environment variable.
    """

    _BASE_URL = "https://api.twelvedata.com/time_series"

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("TWELVE_DATA_API_KEY", "")

    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> tuple[list[Candle], str | None]:
        if not self._api_key:
            raise DataSourceError(
                "TwelveData API key is not set. "
                "Set TWELVE_DATA_API_KEY environment variable."
            )

        td_interval = _TD_INTERVAL_MAP.get(interval)
        if td_interval is None:
            raise DataSourceError(f"unsupported interval for TwelveData: {interval!r}")

        outputsize = _RANGE_OUTPUTSIZE.get(range_)
        if outputsize is None:
            raise DataSourceError(f"unsupported range for TwelveData: {range_!r}")

        params: dict[str, str] = {
            "symbol": symbol,
            "interval": td_interval,
            "outputsize": str(outputsize),
            "apikey": self._api_key,
            "format": "JSON",
        }

        try:
            resp = httpx.get(self._BASE_URL, params=params, timeout=30.0)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("TwelveData fetch failed: symbol=%s err=%s", symbol, exc)
            raise DataSourceError(str(exc)) from exc

        data = resp.json()
        status = data.get("status")
        if status != "ok":
            code = data.get("code", 0)
            message = data.get("message", "unknown error")
            if code == 404 or "not found" in message.lower():
                raise NotFoundError(
                    f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
                )
            raise DataSourceError(f"TwelveData error (code={code}): {message}")

        values = data.get("values", [])
        if not values:
            raise NotFoundError(
                f"no data for symbol={symbol!r} interval={interval!r} range={range_!r}"
            )

        meta = data.get("meta", {})
        tz_name: str | None = meta.get("exchange_timezone")

        candles: list[Candle] = []
        for v in values:
            ts = pd.Timestamp(v["datetime"])
            utc_ts = _to_utc_epoch(ts)
            vol_raw = v.get("volume")
            if vol_raw is None or vol_raw == "":
                volume = 0
            else:
                volume = int(float(vol_raw))
            candles.append(
                Candle(
                    time=utc_ts,
                    open=float(v["open"]),
                    high=float(v["high"]),
                    low=float(v["low"]),
                    close=float(v["close"]),
                    volume=volume,
                )
            )

        candles.sort(key=lambda c: c["time"])
        logger.info(
            "twelvedata ok: symbol=%s interval=%s range=%s rows=%d tz=%s",
            symbol, interval, range_, len(candles), tz_name,
        )
        return candles, tz_name


def create_data_source(name: str) -> DataSource:
    """Factory: create a DataSource by name."""
    if name == "twelvedata":
        return TwelveDataDataSource()
    if name == "finnhub":
        return FinnhubDataSource()
    if name == "alphavantage":
        return AlphaVantageDataSource()
    if name == "yfinance":
        return YFinanceDataSource()
    raise ValueError(f"unknown data source: {name!r}")
