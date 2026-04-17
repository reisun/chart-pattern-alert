from __future__ import annotations

import logging
import math
from typing import Protocol, TypedDict

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
