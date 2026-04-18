# Upstream Proxy Contract — 本プロジェクトが上流プロキシに期待する仕様

## 立ち位置

本プロジェクト (`chart-pattern-alert`) は **HTTP のみで待ち受ける独立したアプリ**です。
TLS 終端や公開ポート (80/443) の公開、公開ドメインの割当は本リポジトリの責務外で、上流に別途配置されるリバースプロキシへ委譲します。

**上流リバースプロキシの具体実装は本リポジトリでは定めません**（利用者の選択）:

- 複数サービスを束ねる共用リバプロに相乗りする（例: 同一ワークスペース内の `reverse-proxy` プロジェクト）
- 本プロジェクト専用の単独リバプロ（Traefik / Nginx / Caddy など）を個別に導入する
- クラウドのマネージドロードバランサや API Gateway に載せる

いずれも可。本ドキュメントは上流プロキシ側から本プロジェクトを取り込むための **契約（最小仕様）** のみを定義します。

## 本プロジェクトが扱う範囲

- `api` コンテナを docker-compose で起動
- 共有 Docker ネットワーク `chart-pattern-alert-net` 上で `api:8000` として可用にする（`docker-compose.yml` は `external: true` 宣言。ネットワーク自体は **`docker network create chart-pattern-alert-net` で事前作成**する前提）
- `.env` の `CORS_ORIGINS` に本番オリジンを設定

## 本プロジェクトが扱わない範囲

- TLS 証明書（Let's Encrypt 等）
- 公開ドメインの取得・DNS
- Nginx / Caddy / Traefik 等の具体設定
- ポート 80/443 のホスト公開

## 想定される接続図

```
Internet
   │
   ▼ 443
[ Router / Public Domain ]
   │
   ▼
[ Upstream Reverse Proxy ]  ← 本リポジトリの外（実装は利用者が選択）
   │ via shared network: chart-pattern-alert-net
   ▼
[ api: FastAPI on :8000 ]
```

## 上流プロキシ側への契約（最小仕様）

上流プロキシが本プロジェクトを取り込む際の最小情報:

| 項目 | 値 |
|---|---|
| Docker ネットワーク名 | `chart-pattern-alert-net`（`external: true` で参加） |
| Upstream service | `api` |
| Upstream port | `8000` |
| Healthcheck path | `/health` |
| 期待マウントパス | `/` 直下に全ルートをマウント推奨。`/api/...` 等サブパスにマウントする場合はフロント側 `VITE_API_BASE_URL` を整合 |

Traefik ラベル / Nginx upstream などの具体設定は **上流プロキシ側リポジトリ** で持ってください。本リポジトリ側の設定は不要です。

## 上流プロキシの選択肢（参考）

- **共用リバプロに相乗り** — 同一ワークスペースの `reverse-proxy` プロジェクトは、複数サービスを同居させる共用リバプロとして運用されています。上記契約を満たせば upstream を1件足すだけで接続可能
- **単独で導入** — 本プロジェクト専用に Traefik / Nginx / Caddy などを立てても構いません。上記契約さえ守られれば本プロジェクト側の変更は不要

## 開発時

- 上流プロキシは不要。`docker compose up -d api` でローカル 8000 に公開
- フロントは `VITE_API_BASE_URL=http://localhost:8000` で接続

## 本番（上流プロキシ経由）時

- `.env` の `CORS_ORIGINS` に公開オリジンと GitHub Pages オリジンの両方を入れる
- `docker-compose.yml` の `ports` はネットワーク内参照のみなら削除してよい

## 接続確認チェックリスト

- [ ] 共有ネットワークが存在（`docker network ls | grep chart-pattern-alert-net`）
- [ ] 上流プロキシ側 compose で `networks.chart-pattern-alert-net.external: true`
- [ ] 上流プロキシ → `api:8000/health` の疎通が 200 返却
- [ ] GitHub Pages から公開 URL にアクセスできる
- [ ] CORS プリフライトが 200 で返る
