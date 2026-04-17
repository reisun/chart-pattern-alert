# chart-pattern-alert

指定した株の買い時・売り時パターンを検出してブラウザ通知する Web アプリ。

- **フロント**: Vite + TypeScript + [lightweight-charts](https://github.com/tradingview/lightweight-charts) → GitHub Pages
- **API**: FastAPI + yfinance → 自宅 Docker ネットワーク内公開（リバプロ別課題）
- **パターン**: 10 種（MVP はダブルボトム／ダブルトップ）

## ディレクトリ構成

```
chart-pattern-alert/
├── api/                       # FastAPI + yfinance（L2 で本実装）
├── web/                       # Vite + TypeScript（L3 で本実装）
├── docs/                      # 設計書
│   ├── architecture.md
│   ├── frontend/
│   │   ├── screens/           # 画面別
│   │   └── services/          # polling, service-worker, storage
│   ├── api/
│   │   ├── endpoints/         # /health, /ohlcv
│   │   ├── data-source.md     # yfinance ラッパー
│   │   └── cors.md
│   ├── patterns/              # 10 パターン + common
│   └── infra/                 # docker-compose, deploy, reverse-proxy
├── docker-compose.yml
├── .env.example
└── .github/workflows/         # L4 で deploy.yml を追加
```

詳しくは [docs/README.md](./docs/README.md)。

## 主要な前提

- **自宅 Docker のリバースプロキシは別プロジェクト**。本リポジトリではリバプロは扱わず、api は docker ネットワーク内で公開されているまでで完結。詳細は [docs/infra/reverse-proxy-assumption.md](./docs/infra/reverse-proxy-assumption.md)
- **パターン検出はフロントエンド(TS)で実装**。API は OHLCV ラッパーに責務を限定。将来 `POST /detect` でサーバー化可能
- **通知はフォアグラウンドのみ**。バックグラウンド Push（Web Push）は MVP 対象外

## 環境変数

`.env` にコピーして編集。詳しくは [`.env.example`](./.env.example)。

| 変数                 | 用途                                 | 既定                                              |
|----------------------|--------------------------------------|---------------------------------------------------|
| `VITE_API_BASE_URL`  | フロント → API の URL                | `http://localhost:8000`                           |
| `CORS_ORIGINS`       | API 側の許可オリジン（カンマ区切り） | `https://reisun.github.io,http://localhost:5173`  |
| `CACHE_TTL_SECONDS`  | OHLCV キャッシュの TTL               | `90`                                              |
| `MAX_RANGE_DAYS`     | 取得範囲の上限ガード                 | `60`                                              |

## 起動（開発時）

> 注: L2/L3 実装完了後に動作します。現状は scaffold のみ。

```bash
# API
cp .env.example .env
docker compose up -d api
curl http://localhost:8000/health   # {"status":"ok",...}

# Frontend
cd web
npm install
npm run dev                          # http://localhost:5173
```

## デプロイ

- フロント: `main` への push で GitHub Actions 経由で GitHub Pages に自動デプロイ（L4 で有効化）
  - 公開 URL: `https://reisun.github.io/chart-pattern-alert/`
- API: 自宅 Docker で `docker compose up -d api`、別プロジェクトのリバプロが前段

## ロードマップ

### L1: Bootstrap & Design（本 PR） ← いま
- プロジェクト基盤、設計書一式、scaffold

### L2: Backend API
- FastAPI + yfinance、/health・/ohlcv、CORS、インメモリ TTL キャッシュ、Dockerfile、pytest

### L3: Frontend MVP + Pattern Detection
- Vite+TS、lightweight-charts、設定 UI、localStorage、SW+通知、ポーリング、ダブルボトム／ダブルトップ検出

### L4: Integration & Deploy
- docker-compose 最終化、GitHub Actions（Pages deploy）、E2E 動作確認、main merge

### 段階拡張（L4 以降）
- 残 7〜8 パターン
- 上位足整合、出来高判定加点
- 複数銘柄タブ UX 改善

## 開発ルール

- feature ブランチ必須、main/develop 直接変更禁止
- small commit、レビュー単位で PR
- `.env` はコミット禁止、`.env.example` はダミー値のみ
- 詳しくは `~/workspace/.agent/AGENTS.md`
