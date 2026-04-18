from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError

from app import __version__
from app.config import load_settings
from app.routes import health as health_routes
from app.routes import ohlcv as ohlcv_routes
from app.services.data_source import create_data_source

logger = logging.getLogger("app.main")


def create_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(
        title="chart-pattern-alert-api",
        version=__version__,
        description="OHLCV wrapper API for chart-pattern-alert.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
        allow_credentials=False,
        max_age=600,
    )

    # Wire data source from config
    ohlcv_routes.set_data_source(create_data_source(settings.data_source))
    logger.info("data_source=%s", settings.data_source)

    app.include_router(health_routes.router)
    app.include_router(ohlcv_routes.router)

    @app.exception_handler(HTTPException)
    async def _http_exc_handler(_: Request, exc: HTTPException) -> JSONResponse:
        # If detail is already in {"error": {...}} shape, pass through.
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "http_error", "message": str(exc.detail)}},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "invalid_request",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                }
            },
        )

    return app


app = create_app()
