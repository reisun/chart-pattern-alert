# chart-pattern-alert

指定した株の買い時・売り時パターンを検出してブラウザ通知する Web アプリ。

- **公開 URL**: https://reisun.github.io/chart-pattern-alert/
- **フロント**: Vite + TypeScript + [lightweight-charts](https://github.com/tradingview/lightweight-charts) → GitHub Pages
- **API**: FastAPI + yfinance → Docker + Cloudflare Quick Tunnel
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
│   └── infra/                     # docker-compose, deploy, upstream-proxy-contract
├── docker-compose.yml
├── .env.example
└── .github/workflows/deploy.yml   # Pages デプロイ
```

詳しくは [docs/README.md](./docs/README.md)。

## 主要な前提

- **API 公開**: Cloudflare Quick Tunnel。起動・設定更新は [Quick Tunnel 手順](./docs/infra/quick-tunnel.md) を参照。
- **パターン検出はフロント側 (TS) 実装**。API は OHLCV ラッパーに責務限定。将来 `POST /detect` で分離可能
- **通知はフォアグラウンドのみ**。バックグラウンド Push（Web Push）は MVP 対象外
- **公開 URL から API へ到達できないとき**、フロントは合成データフォールバックでチャート描画を継続（UI は停止しない）

## 環境変数

`.env` にコピーして編集。ダミー値は [`.env.example`](./.env.example)。

| 変数                 | 用途                                   | 既定                                              |
|----------------------|----------------------------------------|---------------------------------------------------|
| `VITE_API_BASE_URL`  | 開発時の API URL  | `http://localhost:8000`                           |
| `CORS_ORIGINS`       | API 側の許可オリジン（カンマ区切り）   | `https://reisun.github.io,http://localhost:5173`  |
| `CACHE_TTL_SECONDS`  | OHLCV キャッシュの TTL                 | `90`                                              |
| `MAX_RANGE_DAYS`     | 取得範囲の上限ガード                   | `60`                                              |

### 本番 (GitHub Pages) の API URL

`config.json` を起動前に読み込みます。Repository Variable `QUICK_TUNNEL_URL` と Pages の更新手順は [Quick Tunnel 手順](./docs/infra/quick-tunnel.md) を参照してください。

## 起動（開発時）

### API

共有ネットワーク不要。旧リバプロ override を避けて起動します。

```bash
cp .env.example .env
docker compose -f docker-compose.yml up -d api
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
- **API**: `docker compose -f docker-compose.yml up -d api` で HTTP 公開
  - 公開と Pages 設定更新: [Quick Tunnel 手順](./docs/infra/quick-tunnel.md)

## ロードマップ

### ✅ L1: Bootstrap & Design
- プロジェクト基盤、設計書一式、scaffold

### ✅ L2: Backend API
- FastAPI + yfinance、`/health`・`/ohlcv`、CORS、TTL+LRU キャッシュ、Dockerfile、pytest 17 件

### ✅ L3: Frontend MVP + Pattern Detection
- Vite+TS、lightweight-charts、設定 UI、localStorage、SW+通知、ポーリング、ダブルボトム／ダブルトップ検出、vitest 18 件

### ✅ L4: Integration & Deploy
- GitHub Actions（Pages deploy）、`config.json` 実行時読込、Pages 公開

### 段階拡張
- 残 7〜8 パターン（上昇/下降フラッグ、上昇/下降トライアングル、三尊/逆三尊、切り上げ/切り下げレジサポ転換）
- 上位足整合の簡易表示、出来高判定加点
- 複数銘柄タブの UX 改善（通知履歴、絞り込み）
- Service Worker の最小限強化（タブ閉じ時の Web Push は対象外方針のまま）
- Quick Tunnel の URL 更新時に Pages 設定を再配信

## 開発ルール

- feature ブランチ必須、main/develop 直接変更禁止
- small commit、レビュー単位で PR
- `.env` はコミット禁止、`.env.example` はダミー値のみ
- 詳しくは `~/workspace/.agent/AGENTS.md`
