# `GET /ohlcv`

OHLCV（ローソク足＋出来高）を取得する主 API。

## リクエスト

- メソッド: `GET`
- パス: `/ohlcv`
- クエリ:

| 名前       | 必須 | 型     | 既定  | 例          | 説明 |
|------------|------|--------|-------|-------------|------|
| `symbol`   | ✓    | string | -     | `AAPL`, `7203.T` | yfinance のシンボル |
| `interval` | ✓    | string | -     | `5m`        | `1m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk` |
| `range`    |      | string | `5d`  | `1mo`       | `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `max` |

## レスポンス

- ステータス: `200 OK`
- Content-Type: `application/json`

```json
{
  "symbol": "AAPL",
  "interval": "5m",
  "range": "5d",
  "timezone": "America/New_York",
  "candles": [
    {
      "time": 1713369600,
      "open": 172.10,
      "high": 172.35,
      "low": 171.80,
      "close": 172.05,
      "volume": 123456
    }
  ],
  "fetched_at": 1713369923
}
```

- `time`: UTC epoch seconds（ローソク開始時刻）
- `timezone`: 参考値（描画は time を UTC として扱いクライアントで整形推奨）
- `fetched_at`: この応答を生成した時刻。キャッシュヒット時も現在時刻を返す

## エラー

| コード | 条件                                    |
|--------|-----------------------------------------|
| 400    | `symbol`/`interval` 不正、`range` 不正  |
| 404    | yfinance が空配列を返した（銘柄が無効 or 市場休場でデータなし） |
| 429    | yfinance レート超過（軽いバックオフで再試行推奨） |
| 502    | yfinance 通信失敗                       |
| 503    | サーバー過負荷（将来）                  |

エラーボディ:

```json
{ "error": { "code": "invalid_interval", "message": "interval must be one of: 1m,5m,..." } }
```

## キャッシュ

- キー: `(symbol, interval, range)`
- TTL: `CACHE_TTL_SECONDS`（既定 90s）
- 値: 応答 dict をそのまま
- 実装: インメモリ辞書＋時刻（`time.monotonic()`）。プロセス単位で OK

## バリデーション

- `interval` と `range` の組み合わせで yfinance 制約あり。代表例:
  - `1m`: 7日まで（`range` が `5d` 未満）
  - `5m`,`15m`,`30m`,`1h`: 60日まで
  - `1d` 以上: 数年可
- 不正組み合わせは 400 を返す（`docs/api/data-source.md` 参照）

## 備考

- OHLCV は昇順（time 昇順）で返す
- NaN / 欠損足（週末や休場）は除外

## 将来拡張

- `POST /detect`: 検出をサーバー側で行いたくなった時に追加。
- `GET /search?q=...`: シンボル検索（オプション）。
