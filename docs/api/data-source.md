# Data Source — yfinance Wrapper

## 採用

- 第一候補: [yfinance](https://github.com/ranaroussi/yfinance)（非公式）
- 代替候補: Stooq, Alpha Vantage, Twelve Data（API 鍵）

本プロジェクトは個人用なので yfinance で開始。将来の差替を前提に、ラッパーはインターフェースを絞る。

## インタフェース（内部）

```python
# api/app/services/data_source.py
class DataSource(Protocol):
    def fetch_ohlcv(
        self, symbol: str, interval: str, range_: str
    ) -> list[Candle]: ...
```

- `Candle` は TypedDict / dataclass（`time:int, open:float, high:float, low:float, close:float, volume:int`）
- `time` は UTC epoch seconds

## yfinance 実装指針

```python
import yfinance as yf

def fetch_ohlcv(symbol, interval, range_):
    df = yf.Ticker(symbol).history(period=range_, interval=interval, auto_adjust=False)
    if df.empty:
        return []
    df = df.dropna(subset=["Open","High","Low","Close"])
    out = []
    for ts, row in df.iterrows():
        out.append({
          "time": int(ts.tz_convert("UTC").timestamp()),
          "open": float(row["Open"]),
          "high": float(row["High"]),
          "low":  float(row["Low"]),
          "close":float(row["Close"]),
          "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
        })
    return out
```

## interval × range 制約（yfinance 実測の目安）

| interval | 許容 range        | 備考                         |
|----------|-------------------|------------------------------|
| `1m`     | `<= 7d` 程度      | 最新 7 日のみ                |
| `2m`     | `<= 60d`          |                              |
| `5m`     | `<= 60d`          | ★MVP 推奨                    |
| `15m`    | `<= 60d`          |                              |
| `30m`    | `<= 60d`          |                              |
| `1h`     | `<= 730d`         |                              |
| `1d`     | 多くの銘柄で数十年 |                              |
| `1wk`    | 多くの銘柄で数十年 |                              |
| `1mo`    | 多くの銘柄で数十年 |                              |

API 側は `MAX_RANGE_DAYS` を参考に、上記を超える組合せを 400 で返す。

## キャッシュ

- インメモリ辞書（プロセス内）
- キー: `(symbol, interval, range)`
- TTL: `CACHE_TTL_SECONDS`（既定 90s）
- サイズ上限: 256 エントリ程度（LRU は任意、MVP は単純な dict + 期限判定）
- Redis 等は導入しない（単体 Docker で完結）

## レート制限・落ち穴

- yfinance は非公式 API ラッパー。ライブラリ更新で壊れることがある
- 頻度の高いリクエストは 429/一時エラーを返すことがある
- 対処: バックオフ + キャッシュ TTL。429 はそのままクライアントに伝播
- pandas/numpy の新旧バージョンで挙動差があるため、Docker 内で固定 pin 推奨

## シンボル表記

- 米国株: `AAPL`, `MSFT` …
- 日本株: `7203.T`, `9984.T` …
- 韓国株: `005930.KS` …
- 指数: `^GSPC`, `^N225` …
- FX: `USDJPY=X` …

UI では自由入力、API 側は `^`, `=X`, `.T` 等の特殊文字もそのまま受け付ける。

## ロギング

- 取得失敗は WARNING でスタックなし
- 取得成功は INFO（symbol, interval, range, 件数, latency）
- 個人情報は無し

## 将来

- Stooq 実装を追加し、`DATA_SOURCE=yfinance|stooq` で切替
- `POST /detect` を生やすなら pandas を活用しバックエンドでも検出可能
