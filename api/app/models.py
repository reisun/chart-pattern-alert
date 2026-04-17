from __future__ import annotations

from pydantic import BaseModel, Field


class Candle(BaseModel):
    time: int = Field(..., description="UTC epoch seconds (candle open time)")
    open: float
    high: float
    low: float
    close: float
    volume: int


class OhlcvResponse(BaseModel):
    symbol: str
    interval: str
    range: str
    timezone: str | None = None
    candles: list[Candle]
    fetched_at: int


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: int
