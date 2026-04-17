# chart-pattern-alert

指定した株の買い時・売り時パターンを検出してブラウザ通知する Web アプリ。

- **公開 URL**: https://reisun.github.io/chart-pattern-alert/
- **フロント**: Vite + TypeScript + [lightweight-charts](https://github.com/tradingview/lightweight-charts) → GitHub Pages
- **API**: FastAPI + yfinance → 自宅 Docker ネットワーク内公開（リバプロは別プロジェクト）
- **パターン**: 10 種を設計、MVP 実装は **ダブルボトム／ダブルトップ**

## ディレクトリ構成

```
chart-pattern-alert/
├── api/                           # FastAPI + yfinance
│   ├── app/                       # ルート、サービス、モデル
│   ├── tests/                     # pytest (17 件)
│   ├── Dockerfile
│   └── requirements.txt
├── web/                           # Vite + TypeScript
│   ├── src/
│   │   ├── api/                   # API クライアント
│   │   ├── state/                 # localStorage 永続化
│   │   ├── patterns/              # ピボット検出・パターン検出
│   │   ├── services/              # ポーリング、通知
│   │   ├── ui/                    # チャート、タブ、コントロール
│   │   ├── dev/                   # 合成フィクスチャ
│   │   └── app.ts / main.ts
│   ├── public/sw.js               # Service Worker
│   └── tests/                     # vitest (18 件)
├── docs/                          # 設計書
│   ├── architecture.md
│   ├── frontend/{screens,services}/
│   ├── api/{endpoints,data-source.md,cors.md}/
│   ├── patterns/                  # 10 パターン + common
│   └── infra/                     # docker-compose, deploy, reverse-proxy
├── docker-compose.yml
├── .env.example
└── .github/workflows/deploy.yml   # Pages デプロイ
```

詳しくは [docs/README.md](./docs/README.md)。

## 主要な前提

- **自宅 Docker のリバースプロキシは別プロジェクト**。本リポジトリではリバプロは扱わず、api は docker ネットワーク内で公開されているまで。詳細は [docs/infra/reverse-proxy-assumption.md](./docs/infra/reverse-proxy-assumption.md)
- **パターン検出はフロント側 (TS) 実装**。API は OHLCV ラッパーに責務限定。将来 `POST /detect` で分離可能
- **通知はフォアグラウンドのみ**。バックグラウンド Push（Web Push）は MVP 対象外
- **公開 URL から API へ到達できないとき**、フロントは合成データフォールバックでチャート描画を継続（UI は停止しない）

## 環境変数

`.env` にコピーして編集。ダミー値は [`.env.example`](./.env.example)。

| 変数                 | 用途                                   | 既定                                              |
|----------------------|----------------------------------------|---------------------------------------------------|
| `VITE_API_BASE_URL`  | フロント → API の URL（ビルド時注入）  | `http://localhost:8000`                           |
| `CORS_ORIGINS`       | API 側の許可オリジン（カンマ区切り）   | `https://reisun.github.io,http://localhost:5173`  |
| `CACHE_TTL_SECONDS`  | OHLCV キャッシュの TTL                 | `90`                                              |
| `MAX_RANGE_DAYS`     | 取得範囲の上限ガード                   | `60`                                              |

### 本番 (GitHub Pages) の `VITE_API_BASE_URL`

GitHub Actions の Repository Variables に `VITE_API_BASE_URL` を設定しています。ビルド時に注入されます。
自宅リバースプロキシを整備して公開 URL が決まったら、以下で更新できます。

```bash
gh variable set VITE_API_BASE_URL --body "https://<your-home-domain>" --repo reisun/chart-pattern-alert
gh workflow run deploy.yml --repo reisun/chart-pattern-alert
```

## 起動（開発時）

### API

```bash
cp .env.example .env
docker compose up -d api
curl http://localhost:8000/health
# => {"status":"ok","version":"0.1.0","uptime_seconds":...}
curl 'http://localhost:8000/ohlcv?symbol=AAPL&interval=5m&range=5d' | head -c 300
```

### フロント

```bash
cd web
cp .env.example .env           # 必要なら VITE_API_BASE_URL を書き換え
npm install
npm run dev
# => http://localhost:5173/chart-pattern-alert/
```

### テスト

```bash
# API
cd api && python -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/pytest
# => 17 passed

# Web
cd web && npm install && npm test
# => 18 passed
```

## デプロイ

- **フロント**: `main` への push で GitHub Actions が `web/dist/` をビルドし GitHub Pages に配信
  - 公開 URL: https://reisun.github.io/chart-pattern-alert/
  - Workflow: [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- **API**: 自宅 Docker で `docker compose up -d api`
  - ネットワーク: `chart-pattern-alert-net`（別プロジェクトのリバプロが参照する想定）
  - 詳細: [docs/infra/reverse-proxy-assumption.md](./docs/infra/reverse-proxy-assumption.md)

## ロードマップ

### ✅ L1: Bootstrap & Design
- プロジェクト基盤、設計書一式、scaffold

### ✅ L2: Backend API
- FastAPI + yfinance、`/health`・`/ohlcv`、CORS、TTL+LRU キャッシュ、Dockerfile、pytest 17 件

### ✅ L3: Frontend MVP + Pattern Detection
- Vite+TS、lightweight-charts、設定 UI、localStorage、SW+通知、ポーリング、ダブルボトム／ダブルトップ検出、vitest 18 件

### ✅ L4: Integration & Deploy
- GitHub Actions（Pages deploy）、`VITE_API_BASE_URL` ビルド時注入、Pages 公開

### 段階拡張
- 残 7〜8 パターン（上昇/下降フラッグ、上昇/下降トライアングル、三尊/逆三尊、切り上げ/切り下げレジサポ転換）
- 上位足整合の簡易表示、出来高判定加点
- 複数銘柄タブの UX 改善（通知履歴、絞り込み）
- Service Worker の最小限強化（タブ閉じ時の Web Push は対象外方針のまま）
- 自宅リバプロ整備 → 本番 API URL 確定 → `VITE_API_BASE_URL` 更新

## 開発ルール

- feature ブランチ必須、main/develop 直接変更禁止
- small commit、レビュー単位で PR
- `.env` はコミット禁止、`.env.example` はダミー値のみ
- 詳しくは `~/workspace/.agent/AGENTS.md`
