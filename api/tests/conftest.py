from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import ohlcv as ohlcv_routes


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_cache() -> None:
    ohlcv_routes.clear_cache()
    yield
    ohlcv_routes.clear_cache()


class FakeDataSource:
    def __init__(self, candles=None, error: Exception | None = None, tz: str | None = "UTC") -> None:
        self._candles = candles or []
        self._error = error
        self._tz = tz
        self.calls = 0

    def fetch_ohlcv(self, symbol, interval, range_):
        self.calls += 1
        if self._error is not None:
            raise self._error
        return list(self._candles), self._tz


@pytest.fixture
def fake_ds_factory():
    def _factory(**kwargs) -> FakeDataSource:
        ds = FakeDataSource(**kwargs)
        ohlcv_routes.set_data_source(ds)
        return ds
    yield _factory
    # restore real data source after test
    from app.services.data_source import YFinanceDataSource
    ohlcv_routes.set_data_source(YFinanceDataSource())
