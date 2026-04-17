from __future__ import annotations

import time

from fastapi import APIRouter

from app import __version__
from app.models import HealthResponse

router = APIRouter()

_STARTED_AT = time.monotonic()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    uptime = int(time.monotonic() - _STARTED_AT)
    return HealthResponse(status="ok", version=__version__, uptime_seconds=uptime)
