# 設計書インデックス — chart-pattern-alert

このディレクトリにはアプリの設計書を配置します。実装の前にここを読み、変更時はここを更新します。

## 全体

- [architecture.md](./architecture.md) — 全体アーキテクチャ、データフロー、主要コンポーネント

## Frontend

### Screens（画面）

- [frontend/screens/main.md](./frontend/screens/main.md) — メイン画面（銘柄タブ、チャート、コントロール）
- [frontend/screens/settings.md](./frontend/screens/settings.md) — 設定画面（銘柄登録、時間足、ポーリング間隔）

### Services（サービス層）

- [frontend/services/polling.md](./frontend/services/polling.md) — ポーリング戦略、間隔選択
- [frontend/services/service-worker.md](./frontend/services/service-worker.md) — SW 登録と通知
- [frontend/services/storage.md](./frontend/services/storage.md) — localStorage スキーマ

## API

### Endpoints

- [api/endpoints/health.md](./api/endpoints/health.md) — `GET /health`
- [api/endpoints/ohlcv.md](./api/endpoints/ohlcv.md) — `GET /ohlcv`

### 横断

- [api/data-source.md](./api/data-source.md) — yfinance ラッパー、キャッシュ、エラー方針
- [api/cors.md](./api/cors.md) — CORS 設計

## Patterns（買い／売りパターン）

- [patterns/common.md](./patterns/common.md) — 共通ルール（波本数、出来高、上位足整合、だまし、損切り）

### 買いパターン（Bullish）

- [patterns/double-bottom.md](./patterns/double-bottom.md) ★MVP
- [patterns/inverse-head-and-shoulders.md](./patterns/inverse-head-and-shoulders.md)
- [patterns/ascending-flag.md](./patterns/ascending-flag.md)
- [patterns/ascending-triangle.md](./patterns/ascending-triangle.md)
- [patterns/resistance-support-flip-up.md](./patterns/resistance-support-flip-up.md)

### 売りパターン（Bearish）

- [patterns/double-top.md](./patterns/double-top.md) ★MVP
- [patterns/head-and-shoulders.md](./patterns/head-and-shoulders.md)
- [patterns/descending-flag.md](./patterns/descending-flag.md)
- [patterns/descending-triangle.md](./patterns/descending-triangle.md)
- [patterns/resistance-support-flip-down.md](./patterns/resistance-support-flip-down.md)

## Infra

- [infra/docker-compose.md](./infra/docker-compose.md) — サービス構成
- [infra/deploy-github-pages.md](./infra/deploy-github-pages.md) — CI/CD、Pages デプロイ
- [infra/upstream-proxy-contract.md](./infra/upstream-proxy-contract.md) — 上流プロキシ（HTTPS 終端）に期待する契約仕様。具体実装（共用相乗り／単独導入）は利用者の選択

## 段階

- **MVP**: 1銘柄、ダブルボトム/トップ、5分ポーリング、通知、チャート、時間足/スケール切替、localStorage
- **拡張**: 残りパターン、複数銘柄タブ、上位足整合、出来高判定、詳細設定
