from __future__ import annotations

from app.services.data_source import DataSourceError, NotFoundError


def _sample_candles():
    return [
        {"time": 1713369600, "open": 100.0, "high": 101.0, "low": 99.5, "close": 100.5, "volume": 1000},
        {"time": 1713369900, "open": 100.5, "high": 101.2, "low": 100.1, "close": 101.0, "volume": 1500},
    ]


def test_ohlcv_returns_candles(client, fake_ds_factory):
    ds = fake_ds_factory(candles=_sample_candles(), tz="America/New_York")
    res = client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "5d"})
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "AAPL"
    assert body["interval"] == "5m"
    assert body["range"] == "5d"
    assert body["timezone"] == "America/New_York"
    assert len(body["candles"]) == 2
    assert body["candles"][0]["time"] == 1713369600
    assert body["fetched_at"] > 0
    assert ds.calls == 1


def test_ohlcv_cache_hits_second_call(client, fake_ds_factory):
    ds = fake_ds_factory(candles=_sample_candles())
    client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "5d"})
    client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "5d"})
    assert ds.calls == 1  # second call served from cache


def test_ohlcv_different_keys_dont_share_cache(client, fake_ds_factory):
    ds = fake_ds_factory(candles=_sample_candles())
    client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "5d"})
    client.get("/ohlcv", params={"symbol": "MSFT", "interval": "5m", "range": "5d"})
    assert ds.calls == 2


def test_invalid_interval_returns_400(client):
    res = client.get("/ohlcv", params={"symbol": "AAPL", "interval": "9m", "range": "5d"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_interval"


def test_invalid_range_returns_400(client):
    res = client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "7d"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_range"


def test_empty_symbol_returns_400(client):
    res = client.get("/ohlcv", params={"symbol": "   ", "interval": "5m", "range": "5d"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_symbol"


def test_range_exceeds_interval_limit(client):
    # 5m interval has ~60d limit; range=1y (~366d) should fail
    res = client.get("/ohlcv", params={"symbol": "AAPL", "interval": "5m", "range": "1y"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_range_for_interval"


def test_not_found_returns_404(client, fake_ds_factory):
    fake_ds_factory(error=NotFoundError("empty"))
    res = client.get("/ohlcv", params={"symbol": "ZZZZ", "interval": "1d", "range": "5d"})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"


def test_upstream_error_returns_502(client, fake_ds_factory):
    fake_ds_factory(error=DataSourceError("boom"))
    res = client.get("/ohlcv", params={"symbol": "AAPL", "interval": "1d", "range": "5d"})
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "upstream_error"


def test_missing_required_params_returns_400(client):
    res = client.get("/ohlcv", params={"interval": "5m"})
    # FastAPI will reject as 400 via our validation handler
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_request"
