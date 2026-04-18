# CORS

## 想定オリジン

- 本番(GitHub Pages): `https://reisun.github.io`
- 本番(上流プロキシ経由): 上流プロキシ側で同オリジン化されるケースあり。同オリジンなら CORS は不要
- 開発: `http://localhost:5173`（Vite dev）

## 実装

FastAPI の `CORSMiddleware` を使う。

```python
from fastapi.middleware.cors import CORSMiddleware
import os

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
    max_age=600,
)
```

## 設定値（既定）

`.env` または compose env から:

```
CORS_ORIGINS=https://reisun.github.io,http://localhost:5173
```

- カンマ区切りで複数指定
- ワイルドカード `*` は使用しない（`credentials=False` でも事故予防）

## プリフライト

- `GET` のみ使用予定。単純リクエストだがクエリ追加等で preflight が来ることがある
- `OPTIONS` を明示的に許可

## Credentials

- Cookie/認証なし → `allow_credentials=False`

## 本番構成が同一オリジンになる場合

- 上流プロキシ側で `https://<public-domain>/api/...` に集約すれば同一オリジンに。その場合 CORS 不要
- CORS ヘッダが付いていても害はないのでそのまま残してよい

## トラブル時

- DevTools > Network で `Access-Control-Allow-Origin` を確認
- 一致しないオリジンは `CORS_ORIGINS` に追加（再起動が必要）
