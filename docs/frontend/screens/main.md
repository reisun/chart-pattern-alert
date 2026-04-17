# Main Screen

メイン画面の設計。

## 画面要素

```
+-----------------------------------------------------------+
| Header: chart-pattern-alert          [ ⚙ Settings ]       |
|-----------------------------------------------------------|
| [ AAPL ][ 7203.T ][ + Add ]                      (tabs)   |
|-----------------------------------------------------------|
| Interval: [5m v]  Scale: [Auto v]  Poll: [5min v]         |
| Notification: [ Enable ]   Status: ● connected            |
|-----------------------------------------------------------|
|                                                           |
|                   [ Chart (lightweight-charts) ]          |
|                     - Candles                             |
|                     - Pattern markers                     |
|                                                           |
+-----------------------------------------------------------+
| Recent alerts: (list: time / symbol / pattern / direction)|
+-----------------------------------------------------------+
```

## コンポーネント

- **TickerTabs**: 登録銘柄のタブ切替。アクティブタブで表示する銘柄を切替。
  - MVP は 1〜数銘柄の想定。内部データ構造は配列（複数対応）。
- **ChartControls**: 時間足・スケール・ポーリング間隔・通知 ON/OFF。
  - 時間足: `5m`, `15m`, `1h`, `1d`（yfinance の `interval` にそのままマップ）
  - スケール: `Auto`, `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`（表示範囲）
  - ポーリング: `1min`, `5min`, `15min`, `30min`, `1h`（既定 5min）
- **ChartView**: lightweight-charts でローソク足 + 出来高 + マーカー描画。
- **AlertFeed**: 検出履歴（最新順、件数上限でトリム）。クリックで該当時点へジャンプ。

## 状態

- すべて `src/state/appState.ts` に集約（信号/ストア層）
- 永続化するキーは [storage.md](../services/storage.md) 参照
- 非永続: チャート zoom 位置、検出のキャッシュなど

## 操作フロー

1. 起動時: `localStorage` から `symbols`, `activeSymbol`, `interval`, `scale`, `pollingIntervalMs`, `notificationEnabled` を復元
2. アクティブタブの銘柄に対して `GET /ohlcv` を叩き描画
3. パターン検出器に OHLCV を渡し、結果をマーカー & AlertFeed に反映
4. ポーリングタイマーで再取得 → 差分検出時にだけ通知を発火（重複抑制）

## 通知の扱い

- 初回: `Notification: Enable` ボタンを出し、ユーザーの明示操作で `Notification.requestPermission()`
- 以後: 新規検出が出たらタイトル＋短文で通知（SW がフォアグラウンドに通知を出す）
- 通知クリックで該当銘柄タブを開く（SW `notificationclick` → `clients.openWindow` or `focus`）

## 画面サイズ

- PC / タブレットを想定。モバイル対応は MVP 優先度低（レイアウト崩れ回避のみ）

## 非目標（MVP）

- チャート注釈の保存、シェア、ドラッグ描画
- 複数時間足の同時表示（上位足整合は拡張で）
