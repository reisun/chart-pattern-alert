# Infra — docker-compose

## 概要

本プロジェクトは API のみを Docker で運用。フロントは GitHub Pages の静的配信。

```
docker compose -f docker-compose.yml up -d api
       │
       ▼
   ┌─────────────────────────┐
   │ chart-pattern-alert-api │
   │  FastAPI + yfinance     │
   │  port: 8000 (dev)       │
   │  network: Compose default
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
  - 本番ではcloudflared が同一ネットワーク内から参照するため、ポート公開は不要または削除可
- healthcheck: `/health` を定期的に叩く

## ネットワーク

Compose の既定ネットワークを使用します。共有リバプロネットワークは不要です。
Quick Tunnel は専用 override から同じネットワークへ参加します。
[Quick Tunnel 手順](./quick-tunnel.md) を参照してください。

## コマンド（許可範囲）

- `up -d`, `stop`, `start`, `restart`, `ps`, `logs`, `build`
- 要確認: `down -v`, volume / image 削除

## 運用

### 起動

```bash
docker compose -f docker-compose.yml up -d api
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
