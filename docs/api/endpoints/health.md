# `GET /health`

Liveness/Readiness プローブ用の最小エンドポイント。

## リクエスト

- メソッド: `GET`
- パス: `/health`
- 認証: なし

## レスポンス

- ステータス: `200 OK`
- Content-Type: `application/json`
- ボディ:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_seconds": 1234
}
```

- `status`: `"ok"`（将来 `"degraded"` 等の導入余地）
- `version`: サーバーのバージョン（`pyproject.toml` / `importlib.metadata` から）
- `uptime_seconds`: プロセス起動からの秒数

## 失敗時

- プロセスが動いていれば常に 200 を返す（外部依存（yfinance）不通でも 200）
- 外部依存の状態は別エンドポイント（将来 `/readiness` 等で分離予定）

## 用途

- docker-compose の healthcheck
- リバースプロキシの upstream 死活監視
