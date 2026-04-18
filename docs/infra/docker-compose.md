# Infra — docker-compose

## 概要

本プロジェクトは API のみを Docker で運用。フロントは GitHub Pages の静的配信。

```
docker compose up -d api
       │
       ▼
   ┌─────────────────────────┐
   │ chart-pattern-alert-api │
   │  FastAPI + yfinance     │
   │  port: 8000 (dev)       │
   │  network: chart-pattern-alert-net
   └─────────────────────────┘
```

## サービス

### `api`

- build: `./api`
- image: `chart-pattern-alert-api:local`
- env:
  - `CORS_ORIGINS`
  - `CACHE_TTL_SECONDS`
  - `MAX_RANGE_DAYS`
- ports（開発用）: `8000:8000`
  - 本番では上流プロキシが同一ネットワーク内から参照するため、ポート公開は不要または削除可
- healthcheck: `/health` を定期的に叩く

## ネットワーク

- `chart-pattern-alert-net`（bridge）
- 上流プロキシ側から `external: true` で参照する想定（契約仕様は [upstream-proxy-contract.md](./upstream-proxy-contract.md)）:

```yaml
# 参考（上流プロキシ側 compose）
networks:
  chart-pattern-alert-net:
    external: true
```

## コマンド（許可範囲）

- `up -d`, `stop`, `start`, `restart`, `ps`, `logs`, `build`
- 要確認: `down -v`, volume / image 削除

## 運用

### 起動

```bash
docker compose up -d api
```

### 停止

```bash
docker compose stop api
```

### ログ

```bash
docker compose logs -f api
```

## 将来

- `web` を Dockerize する必要は基本なし（静的ホスティング）
- 必要なら CI 用 `build` サービスを追加
