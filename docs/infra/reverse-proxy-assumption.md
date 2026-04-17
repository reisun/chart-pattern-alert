# Reverse Proxy Assumption — 本プロジェクトのスコープ外明示

## 立ち位置

本プロジェクト (`chart-pattern-alert`) は、**自宅 Docker のリバースプロキシ（別プロジェクト）が前段に立つ前提**で設計されています。
本リポジトリではリバプロ自体は扱いません。

## 本プロジェクトが扱う範囲

- `api` コンテナを docker-compose で起動する
- `chart-pattern-alert-net` ネットワーク上で `api:8000` として可用にする
- `.env` の `CORS_ORIGINS` に本番オリジンを入れる

## 本プロジェクトが扱わない範囲

- TLS 証明書（Let's Encrypt 等）
- 公開ドメインの取得・DNS
- Nginx/Caddy/Traefik 等の設定
- ポート 80/443 のホスト公開

## 想定される接続図

```
Internet
   │
   ▼ 443
[ Home Router / Public Domain ]
   │
   ▼
[ Reverse Proxy container(別プロジェクト) ]
   │ via shared network: chart-pattern-alert-net
   ▼
[ api: FastAPI on :8000 ]
```

## リバプロ側への要望（仕様メモ）

別プロジェクト側で本プロジェクトを取り込む際の最小情報:

- Docker ネットワーク名: `chart-pattern-alert-net`
- Upstream service: `api`
- Upstream port: `8000`
- Healthcheck path: `/health`
- 期待パス: `/` 直下に全ルートをマウントする想定（`/api/...` にマウントする場合はフロントの `VITE_API_BASE_URL` を合わせる）

例（`Traefik` ラベル or `Nginx` upstream）は別プロジェクト側に記述。

## 開発時

- リバプロは不要。`docker compose up -d api` でローカル 8000 公開。
- フロントは `VITE_API_BASE_URL=http://localhost:8000` で接続。

## 本番（リバプロ経由）時

- `.env` の `CORS_ORIGINS` にリバプロ公開オリジンと GitHub Pages オリジンの両方を入れる
- `ports` は compose から削除してよい（ネットワーク内参照のみ）

## 将来 — リバプロ取り込み時の接続確認チェックリスト

- [ ] 共有ネットワークが存在（`docker network ls | grep chart-pattern-alert-net`）
- [ ] リバプロ側 compose で `networks.chart-pattern-alert-net.external: true`
- [ ] リバプロ→api の healthcheck 合格
- [ ] GitHub Pages から公開 URL にアクセスできる
- [ ] CORS プリフライトが 200 で返る
