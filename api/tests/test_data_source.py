from __future__ import annotations

from unittest.mock import patch, MagicMock

import pandas as pd
import pytest

from app.services.data_source import (
    AlphaVantageDataSource,
    FinnhubDataSource,
    TwelveDataDataSource,
    YFinanceDataSource,
    create_data_source,
    DataSourceError,
    NotFoundError,
)


# ---- Factory tests ----

def test_create_data_source_yfinance():
    ds = create_data_source("yfinance")
    assert isinstance(ds, YFinanceDataSource)


def test_create_data_source_alphavantage():
    ds = create_data_source("alphavantage")
    assert isinstance(ds, AlphaVantageDataSource)


def test_create_data_source_finnhub():
    ds = create_data_source("finnhub")
    assert isinstance(ds, FinnhubDataSource)


def test_create_data_source_twelvedata():
    ds = create_data_source("twelvedata")
    assert isinstance(ds, TwelveDataDataSource)


def test_create_data_source_unknown():
    with pytest.raises(ValueError, match="unknown data source"):
        create_data_source("blah")


# ---- AlphaVantageDataSource CSV parsing tests ----

_SAMPLE_CSV = """\
timestamp,open,high,low,close,volume
2024-04-15,170.0,172.5,169.0,171.5,50000000
2024-04-16,171.5,173.0,170.5,172.0,48000000
2024-04-17,172.0,174.0,171.0,173.5,52000000
"""

_SAMPLE_CSV_NO_VOLUME = """\
timestamp,open,high,low,close
2024-04-15,170.0,172.5,169.0,171.5
2024-04-16,171.5,173.0,170.5,172.0
"""

_SAMPLE_CSV_INTRADAY = """\
timestamp,open,high,low,close,volume
2024-04-15 09:30:00,170.0,172.5,169.0,171.5,50000000
2024-04-15 09:35:00,171.5,173.0,170.5,172.0,48000000
"""


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
def test_alphavantage_parses_csv(mock_get):
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="test_key")
    candles, tz = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert tz is None
    assert len(candles) == 3
    assert candles[0]["open"] == 170.0
    assert candles[0]["volume"] == 50000000
    assert candles[2]["close"] == 173.5
    # check sorted by time
    assert candles[0]["time"] <= candles[1]["time"] <= candles[2]["time"]


@patch("app.services.data_source.httpx.get")
def test_alphavantage_missing_volume_defaults_zero(mock_get):
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV_NO_VOLUME)
    ds = AlphaVantageDataSource(api_key="test_key")
    candles, _ = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert len(candles) == 2
    assert candles[0]["volume"] == 0


@patch("app.services.data_source.httpx.get")
def test_alphavantage_empty_response_raises_not_found(mock_get):
    mock_get.return_value = _FakeResponse("")
    ds = AlphaVantageDataSource(api_key="test_key")
    with pytest.raises(NotFoundError):
        ds.fetch_ohlcv("ZZZZ", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_alphavantage_http_error_raises_datasource_error(mock_get):
    import httpx as _httpx
    mock_get.side_effect = _httpx.ConnectError("connection refused")
    ds = AlphaVantageDataSource(api_key="test_key")
    with pytest.raises(DataSourceError):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


def test_alphavantage_unsupported_interval():
    ds = AlphaVantageDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="unsupported interval"):
        ds.fetch_ohlcv("AAPL", "2m", "5d")


@patch("app.services.data_source.httpx.get")
def test_alphavantage_url_params_daily(mock_get):
    """Verify correct URL params are sent for daily interval."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="test_key")
    ds.fetch_ohlcv("MSFT", "1d", "1mo")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["symbol"] == "MSFT"
    assert params["function"] == "TIME_SERIES_DAILY"
    assert params["datatype"] == "csv"
    assert params["outputsize"] == "compact"
    assert params["apikey"] == "test_key"
    assert "interval" not in params


@patch("app.services.data_source.httpx.get")
def test_alphavantage_url_params_intraday(mock_get):
    """Verify correct URL params for intraday interval."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV_INTRADAY)
    ds = AlphaVantageDataSource(api_key="test_key")
    ds.fetch_ohlcv("AAPL", "5m", "1d")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["function"] == "TIME_SERIES_INTRADAY"
    assert params["interval"] == "5min"
    assert params["outputsize"] == "compact"


@patch("app.services.data_source.httpx.get")
def test_alphavantage_url_params_max_range(mock_get):
    """range=max should use outputsize=full."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="test_key")
    ds.fetch_ohlcv("AAPL", "1d", "max")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["outputsize"] == "full"


@patch.dict("os.environ", {"ALPHA_VANTAGE_API_KEY": ""}, clear=False)
def test_alphavantage_api_key_not_set():
    """API key not set raises DataSourceError."""
    ds = AlphaVantageDataSource(api_key="")
    with pytest.raises(DataSourceError, match="API key is not set"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_alphavantage_sends_api_key(mock_get):
    """When api_key is provided, it's included in the request params."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="my_secret_key")
    ds.fetch_ohlcv("AAPL", "1d", "5d")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["apikey"] == "my_secret_key"


@patch("app.services.data_source.httpx.get")
def test_alphavantage_error_message_response(mock_get):
    """Alpha Vantage JSON error response is detected."""
    body = '{"Error Message": "Invalid API call."}'
    mock_get.return_value = _FakeResponse(body)
    ds = AlphaVantageDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="Alpha Vantage error"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_alphavantage_rate_limit_note_response(mock_get):
    """Alpha Vantage rate limit Note response is detected."""
    body = '{"Note": "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day."}'
    mock_get.return_value = _FakeResponse(body)
    ds = AlphaVantageDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="rate limit"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_alphavantage_weekly_function(mock_get):
    """Weekly interval uses TIME_SERIES_WEEKLY."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="test_key")
    ds.fetch_ohlcv("AAPL", "1wk", "1y")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["function"] == "TIME_SERIES_WEEKLY"


@patch("app.services.data_source.httpx.get")
def test_alphavantage_monthly_function(mock_get):
    """Monthly interval uses TIME_SERIES_MONTHLY."""
    mock_get.return_value = _FakeResponse(_SAMPLE_CSV)
    ds = AlphaVantageDataSource(api_key="test_key")
    ds.fetch_ohlcv("AAPL", "1mo", "1y")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["function"] == "TIME_SERIES_MONTHLY"


# ---- FinnhubDataSource tests ----

import json

_FINNHUB_OK_JSON = json.dumps({
    "o": [170.0, 171.5, 172.0],
    "h": [172.5, 173.0, 174.0],
    "l": [169.0, 170.5, 171.0],
    "c": [171.5, 172.0, 173.5],
    "v": [50000000, 48000000, 52000000],
    "t": [1713139200, 1713225600, 1713312000],
    "s": "ok",
})

_FINNHUB_OK_NONE_VOLUME_JSON = json.dumps({
    "o": [170.0, 171.5],
    "h": [172.5, 173.0],
    "l": [169.0, 170.5],
    "c": [171.5, 172.0],
    "v": [None, 48000000],
    "t": [1713139200, 1713225600],
    "s": "ok",
})

_FINNHUB_NO_DATA_JSON = json.dumps({"s": "no_data"})


class _FakeJsonResponse:
    def __init__(self, body: str, status_code: int = 200):
        self._body = body
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            import httpx
            raise httpx.HTTPStatusError(
                "error", request=MagicMock(), response=MagicMock(status_code=self.status_code)
            )

    def json(self):
        return json.loads(self._body)


@patch("app.services.data_source.httpx.get")
def test_finnhub_parses_json(mock_get):
    mock_get.return_value = _FakeJsonResponse(_FINNHUB_OK_JSON)
    ds = FinnhubDataSource(api_key="test_key")
    candles, tz = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert tz is None
    assert len(candles) == 3
    assert candles[0]["open"] == 170.0
    assert candles[0]["volume"] == 50000000
    assert candles[2]["close"] == 173.5
    assert candles[0]["time"] <= candles[1]["time"] <= candles[2]["time"]


@patch("app.services.data_source.httpx.get")
def test_finnhub_volume_none_defaults_zero(mock_get):
    mock_get.return_value = _FakeJsonResponse(_FINNHUB_OK_NONE_VOLUME_JSON)
    ds = FinnhubDataSource(api_key="test_key")
    candles, _ = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert len(candles) == 2
    assert candles[0]["volume"] == 0
    assert candles[1]["volume"] == 48000000


@patch("app.services.data_source.httpx.get")
def test_finnhub_no_data_raises_not_found(mock_get):
    mock_get.return_value = _FakeJsonResponse(_FINNHUB_NO_DATA_JSON)
    ds = FinnhubDataSource(api_key="test_key")
    with pytest.raises(NotFoundError):
        ds.fetch_ohlcv("ZZZZ", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_finnhub_http_error_raises_datasource_error(mock_get):
    import httpx as _httpx
    mock_get.side_effect = _httpx.ConnectError("connection refused")
    ds = FinnhubDataSource(api_key="test_key")
    with pytest.raises(DataSourceError):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


def test_finnhub_unsupported_interval():
    ds = FinnhubDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="unsupported interval"):
        ds.fetch_ohlcv("AAPL", "2m", "5d")


@patch("app.services.data_source.httpx.get")
def test_finnhub_url_params(mock_get):
    """Verify correct URL params are sent."""
    mock_get.return_value = _FakeJsonResponse(_FINNHUB_OK_JSON)
    ds = FinnhubDataSource(api_key="test_key")
    ds.fetch_ohlcv("MSFT", "5m", "1mo")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["symbol"] == "MSFT"
    assert params["resolution"] == "5"
    assert params["token"] == "test_key"
    assert "from" in params
    assert "to" in params
    # from/to should be numeric strings
    assert params["from"].isdigit()
    assert params["to"].isdigit()


@patch.dict("os.environ", {"FINNHUB_API_KEY": ""}, clear=False)
def test_finnhub_api_key_not_set():
    """API key not set raises DataSourceError."""
    ds = FinnhubDataSource(api_key="")
    with pytest.raises(DataSourceError, match="API key is not set"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


# ---- TwelveDataDataSource tests ----

_TD_OK_JSON = json.dumps({
    "meta": {
        "symbol": "AAPL",
        "interval": "1day",
        "currency": "USD",
        "exchange_timezone": "America/New_York",
        "exchange": "NASDAQ",
        "type": "Common Stock",
    },
    "values": [
        {"datetime": "2024-04-17", "open": "172.0", "high": "174.0", "low": "171.0", "close": "173.5", "volume": "52000000"},
        {"datetime": "2024-04-16", "open": "171.5", "high": "173.0", "low": "170.5", "close": "172.0", "volume": "48000000"},
        {"datetime": "2024-04-15", "open": "170.0", "high": "172.5", "low": "169.0", "close": "171.5", "volume": "50000000"},
    ],
    "status": "ok",
})

_TD_OK_NO_VOLUME_JSON = json.dumps({
    "meta": {
        "symbol": "AAPL",
        "interval": "1day",
        "exchange_timezone": "America/New_York",
    },
    "values": [
        {"datetime": "2024-04-15", "open": "170.0", "high": "172.5", "low": "169.0", "close": "171.5", "volume": "0"},
        {"datetime": "2024-04-16", "open": "171.5", "high": "173.0", "low": "170.5", "close": "172.0", "volume": ""},
    ],
    "status": "ok",
})

_TD_ERROR_NOT_FOUND_JSON = json.dumps({
    "code": 404,
    "message": "Data not found",
    "status": "error",
})

_TD_ERROR_AUTH_JSON = json.dumps({
    "code": 401,
    "message": "Invalid API key",
    "status": "error",
})

_TD_ERROR_RATE_LIMIT_JSON = json.dumps({
    "code": 429,
    "message": "Too many requests",
    "status": "error",
})


@patch("app.services.data_source.httpx.get")
def test_twelvedata_parses_json(mock_get):
    mock_get.return_value = _FakeJsonResponse(_TD_OK_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    candles, tz = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert tz == "America/New_York"
    assert len(candles) == 3
    assert candles[0]["open"] == 170.0
    assert candles[0]["volume"] == 50000000
    assert candles[2]["close"] == 173.5
    # sorted ascending by time (values come descending from API)
    assert candles[0]["time"] <= candles[1]["time"] <= candles[2]["time"]


@patch("app.services.data_source.httpx.get")
def test_twelvedata_volume_missing_defaults_zero(mock_get):
    mock_get.return_value = _FakeJsonResponse(_TD_OK_NO_VOLUME_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    candles, _ = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert len(candles) == 2
    assert candles[0]["volume"] == 0
    assert candles[1]["volume"] == 0


@patch("app.services.data_source.httpx.get")
def test_twelvedata_not_found_raises_not_found(mock_get):
    mock_get.return_value = _FakeJsonResponse(_TD_ERROR_NOT_FOUND_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    with pytest.raises(NotFoundError):
        ds.fetch_ohlcv("ZZZZ", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_twelvedata_auth_error_raises_datasource_error(mock_get):
    mock_get.return_value = _FakeJsonResponse(_TD_ERROR_AUTH_JSON)
    ds = TwelveDataDataSource(api_key="bad_key")
    with pytest.raises(DataSourceError, match="code=401"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_twelvedata_rate_limit_raises_datasource_error(mock_get):
    mock_get.return_value = _FakeJsonResponse(_TD_ERROR_RATE_LIMIT_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="code=429"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_twelvedata_http_error_raises_datasource_error(mock_get):
    import httpx as _httpx
    mock_get.side_effect = _httpx.ConnectError("connection refused")
    ds = TwelveDataDataSource(api_key="test_key")
    with pytest.raises(DataSourceError):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


def test_twelvedata_unsupported_interval():
    ds = TwelveDataDataSource(api_key="test_key")
    with pytest.raises(DataSourceError, match="unsupported interval"):
        ds.fetch_ohlcv("AAPL", "2m", "5d")


@patch("app.services.data_source.httpx.get")
def test_twelvedata_url_params(mock_get):
    """Verify correct URL params are sent."""
    mock_get.return_value = _FakeJsonResponse(_TD_OK_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    ds.fetch_ohlcv("MSFT", "5m", "1mo")
    call_kwargs = mock_get.call_args
    params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params")
    assert params["symbol"] == "MSFT"
    assert params["interval"] == "5min"
    assert params["outputsize"] == "1000"
    assert params["apikey"] == "test_key"
    assert params["format"] == "JSON"


@patch.dict("os.environ", {"TWELVE_DATA_API_KEY": ""}, clear=False)
def test_twelvedata_api_key_not_set():
    """API key not set raises DataSourceError."""
    ds = TwelveDataDataSource(api_key="")
    with pytest.raises(DataSourceError, match="API key is not set"):
        ds.fetch_ohlcv("AAPL", "1d", "5d")


@patch("app.services.data_source.httpx.get")
def test_twelvedata_timezone_from_meta(mock_get):
    """Timezone is extracted from meta.exchange_timezone."""
    mock_get.return_value = _FakeJsonResponse(_TD_OK_JSON)
    ds = TwelveDataDataSource(api_key="test_key")
    _, tz = ds.fetch_ohlcv("AAPL", "1d", "5d")
    assert tz == "America/New_York"
