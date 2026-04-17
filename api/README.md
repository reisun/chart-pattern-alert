# API (FastAPI + yfinance)

OHLCV ラッパー API。L2 (Backend) で本実装します。

## 概要

- FastAPI
- 株価データソース: yfinance（第一候補。L2 で代替案も検討）
- エンドポイント: `/health`, `/ohlcv`
- CORS は `CORS_ORIGINS`（カンマ区切り）で制御
- OHLCV はインメモリ TTL キャッシュ（`CACHE_TTL_SECONDS`）

## 起動（L2 以降）

```bash
# プロジェクトルートで
docker compose up -d api
curl http://localhost:8000/health
```

## 設計書

- エンドポイント: [`docs/api/endpoints/`](../docs/api/endpoints/)
- データソース: [`docs/api/data-source.md`](../docs/api/data-source.md)
- CORS: [`docs/api/cors.md`](../docs/api/cors.md)
