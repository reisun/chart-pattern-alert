# Polling

チャート更新とパターン検出のポーリング戦略。

## 基本設計

- `setInterval` ベースの単純ポーリング（MVP）
- 間隔は `pollingIntervalMs` で `localStorage` 永続化
- アクティブタブ（選択中銘柄）は確実に更新。非アクティブタブは必要に応じて追従（MVP は全銘柄ポーリング）

## 間隔選択

UI で選択可能な一般的範囲:

| 表示     | 値(ms)  | 備考                     |
|----------|---------|--------------------------|
| 1min     | 60000   | 5m 足以下ではやりすぎ注意 |
| 5min     | 300000  | 既定                     |
| 15min    | 900000  | 15m 足向き               |
| 30min    | 1800000 | 1h 足向き                |
| 1h       | 3600000 | 1h/1d 足向き             |

## 実装指針

```ts
// pseudo
function startPolling() {
  const tick = async () => {
    for (const sym of symbols) {
      const data = await fetchOhlcv(sym, interval, range);
      const patterns = detectPatterns(data);
      updateChart(sym, data, patterns);
      notifyOnNew(sym, patterns);
    }
  };
  tick(); // 即時 1 回
  const id = setInterval(tick, pollingIntervalMs);
  return () => clearInterval(id);
}
```

## タブ可視性

- `document.visibilitychange` を監視
  - 非表示に戻った時: 次 tick のスケジュールは維持（通知はタブが閉じていても SW 経由で出せる）
  - 再表示時: 即時 `tick()` を 1 回（古い表示を一掃）

## 新規検出の判定

- 直近 tick との差分で `DetectedPattern.id` が新規のときだけ通知
- ID は `kind + markerTime + symbol + neckline` 等から stable hash
- 同じパターンが再検出されても通知しない（誤爆抑制）

## エラー時

- ネットワーク失敗は 3 回まで指数バックオフ（250ms → 500ms → 1s）
- それでも失敗なら UI に Status: ● disconnected を表示、tick は継続

## バックグラウンド通知

- MVP は Service Worker が前面ではなくタブ可視でも通知を出す構成で十分
- タブを閉じた場合のバックグラウンド Push は Web Push が必要なため MVP 対象外
