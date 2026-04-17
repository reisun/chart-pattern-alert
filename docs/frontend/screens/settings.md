# Settings Screen

銘柄と全体設定の管理画面。

## 画面要素

```
+------------------ Settings ------------------+
| Symbols                                       |
|  [ AAPL          ] ✕                          |
|  [ 7203.T        ] ✕                          |
|  [ + Add symbol: _______________ ] [ Add ]    |
|                                               |
| Defaults                                      |
|  Interval      [5m v]                         |
|  Scale         [Auto v]                       |
|  Polling       [5min v]                       |
|                                               |
| Notification                                  |
|  [ x ] Enable browser notifications           |
|  [ Re-test notification ]                     |
|                                               |
| API                                           |
|  Base URL (runtime override, optional):       |
|  [ _______________________________________ ]  |
|                                               |
| [ Save ]   [ Close ]                          |
+-----------------------------------------------+
```

## 設定項目

- **Symbols**: 登録銘柄一覧。追加/削除。MVP では自由入力（yfinance のシンボル）。
  - 例: `AAPL`, `MSFT`, `7203.T`（日本株は `.T` サフィックス）, `005930.KS` 等
- **Defaults**: 新規銘柄タブに適用する既定値。
  - Interval: `5m`, `15m`, `1h`, `1d`
  - Scale: `Auto`, `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`
  - Polling: `1min`, `5min`, `15min`, `30min`, `1h`
- **Notification**: ON/OFF と再テスト。
  - Re-test: `Notification.permission` を確認しつつテスト通知を 1 件発火
- **API Base URL (optional)**: 既定は `VITE_API_BASE_URL`。開発時に `localStorage` に書かれた値で上書き可。

## 保存

- 全項目とも `localStorage` に保存。キー設計は [storage.md](../services/storage.md) 参照。

## バリデーション（軽め）

- 銘柄文字列は空白除外、重複は追加しない
- Base URL は `http(s)://` 判定のみ。本格的な検証はしない

## 非目標（MVP）

- アカウント同期（ローカル専用）
- 銘柄のグルーピング/並べ替え
