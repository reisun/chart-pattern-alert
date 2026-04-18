from __future__ import annotations

from unittest.mock import patch, MagicMock

import pandas as pd
import pytest

from app.services.data_source import (
    StooqDataSource,
    YFinanceDataSource,
    create_data_source,
    DataSourceError,
    NotFoundError,
)


# ---- Factory tests ----

def test_create_data_source_yfinance():
    ds = create_data_source("yfinance")
    assert isinstance(ds, YFinanceDataSource)


def test_create_data_source_stooq():
    ds = create_data_source("stooq")
    assert isinstance(ds, StooqDataSource)


def test_create_data_source_unknown():
    with pytest.raises(ValueError, match="unknown data source"):
        create_data_source("blah")


# ---- StooqDataSource CSV parsing tests ----

_SAMPLE_CSV = """\
Date,Open,High,Low,Close,Volume
2024-04-15,170.0,172.5,169.0,171.5,50000000
2024-04-16,171.5,173.0,170.5,172.0,48000000
2024-04-17,172.0,174.0,171.0,173.5,52000000
"""

_SAMPLE_CSV_NO_VOLUME = """\
Date,Open,High,Low,Close
2024-04-15,170.0,172.5,169.0,171.5
2024-04-16,171.5,173.0,170.5,172.0
"""

_SAMPLE_CSV_EMPTY = "No data"


class _FakeResponse:
    def __init__(self, text: str, status_code: int = 200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            import httpx
            raise httpx.HTTPStatusError(
                "error", request=MagicMock(), response=MagicMock(status_code=self.status_code)
            )


@patch("app.services.data_source.httpx.get")
def test_stooq_parses_csv(mock_get):
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = StooqDataSource()
    candles, tz = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert tz is None
    assert len(candles) == 3
    assert candles[0]["open"] == 170.0
    assert candles[0]["volume"] == 50000000
    assert candles[2]["close"] == 173.5
    # check sorted by time
    assert candles[0]["time"] <= candles[1]["time"] <= candles[2]["time"]


@patch("app.services.data_source.httpx.get")
def test_stooq_missing_volume_defaults_zero(mock_get):
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV_NO_VOLUME)
    ds = StooqDataSource()
    candles, _ = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert len(candles) == 2
    assert candles[0]["volume"] == 0


@patch("app.services.data_source.httpx.get")
def test_stooq_no_data_raises_not_found(mock_get):
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV_EMPTY)
    ds = StooqDataSource()
    with pytest.raises(NotFoundError):
        ds.fetch_ohlcv("ZZZZ", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_stooq_empty_response_raises_not_found(mock_get):
    mock_get.return_value = _FakeResponse("")
    ds = StooqDataSource()
    with pytest.raises(NotFoundError):
        ds.fetch_ohlcv("ZZZZ", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_stooq_http_error_raises_datasource_error(mock_get):
    import httpx as _httpx
    mock_get.side_effect = _httpx.ConnectError("connection refused")
    ds = StooqDataSource()
    with pytest.raises(DataSourceError):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


def test_stooq_unsupported_interval():
    ds = StooqDataSource()
    with pytest.raises(DataSourceError, match="unsupported interval"):
        ds.fetch_ohlcv("AAPL", "2m", "5d")


@patch("app.services.data_source.httpx.get")
def test_stooq_url_params(mock_get):
    """Verify correct URL params are sent to Stooq."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = StooqDataSource()
    ds.fetch_ohlcv("MSFT", "1h", "1mo")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["s"] == "MSFT.US"
    assert params["i"] == "60"


@patch("app.services.data_source.httpx.get")
def test_stooq_api_key_error(mock_get):
    """Stooq returns a plaintext message when API key is missing."""
    body = "Get your apikey:\n1. Open https://stooq.com/..."
    mock_get.return_value = _FakeResponse(body)
    ds = StooqDataSource()
    with pytest.raises(DataSourceError, match="API key"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_stooq_sends_api_key_when_set(mock_get):
    """When api_key is provided, it's included in the request params."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = StooqDataSource(api_key="test_key_123")
    ds.fetch_ohlcv("AAPL", "1d", "5d")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["apikey"] == "test_key_123"
