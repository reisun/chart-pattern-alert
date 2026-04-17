# Double Bottom（ダブルボトム）★MVP

## 概要

**W 字**の形。安値を 2 回つけて下げ止まり、上に向かう。

```
        ┌── 中央の山 ──┐
       /                \
      /                  \
  ───＊                    ＊───  ← ネックライン(2 底の間の高値)
      \                  /
       \                /
    底1 ＊          ＊ 底2
```

## 意味合い

- 売りが 2 回試されたがもう下げきれない
- 底打ちの候補

## 見るポイント（要件定義より）

- 2 つ目の底で**大きく安値更新しない**（底 1 ≈ 底 2、多少低くてもよいが許容閾値内）
- **W 中央の山を上抜けると、より強い買いサイン**（ネックライン突破）

## 検出アルゴリズム（MVP）

入力: `Candle[]`（昇順）

1. [common.md](./common.md) の極値検出で Pivot 列を得る
2. 直近の 3〜5 本の Pivot を対象に `low, high, low` の並びを探す（中央が high、両脇が low）
3. ルール:
   - 底 1, 底 2 の価格差が `|low2 - low1| / low1 <= doubleBottomTolPct`（既定 1.5%）
   - 中央の山 `mid.high` が `max(low1, low2) * (1 + minSwingPct)` より十分高い
   - 底 1 → 底 2 までの本数が `patternMinBars..patternMaxBars` 範囲内
4. 確定トリガ:
   - 直近足の `close` が `mid.high`（＝ネックライン）を上抜け
   - 上抜けない場合は **仮検出**。MVP は仮検出でマーカーを出すが通知は出さない
5. 出力:
   - `kind: 'double_bottom'`, `direction: 'bullish'`
   - `startTime = low1.time`, `endTime = low2.time`, `markerTime = low2.time`
   - `neckline = mid.high`

## 閾値（既定）

| 名称                  | 既定    | 場所                   |
|-----------------------|---------|------------------------|
| `doubleBottomTolPct`  | 1.5%    | `config.ts`            |
| `patternMinBars`      | 10      | `config.ts` (共通)     |
| `patternMaxBars`      | 50      | `config.ts` (共通)     |
| `necklineTolPct`      | 0.2%    | `config.ts` (共通)     |

## マーカー

- 底 2 の足の下に `arrowUp` 表示、略号 `DB`
- 確定（ネックライン突破）時は塗りつぶしに切替、通知を発火

## 擬似コード

```ts
function detectDoubleBottom(candles, pivots, cfg): DetectedPattern[] {
  const out = [];
  for (let i = 2; i < pivots.length; i++) {
    const [a, b, c] = [pivots[i-2], pivots[i-1], pivots[i]];
    if (a.kind !== 'low' || b.kind !== 'high' || c.kind !== 'low') continue;
    const bars = candles.findIndex(x => x.time === c.time) - candles.findIndex(x => x.time === a.time);
    if (bars < cfg.patternMinBars || bars > cfg.patternMaxBars) continue;
    const priceGap = Math.abs(c.price - a.price) / a.price;
    if (priceGap > cfg.doubleBottomTolPct) continue;
    const neckline = b.price;
    const lastClose = candles[candles.length - 1].close;
    const confirmed = lastClose > neckline * (1 + cfg.necklineTolPct);
    out.push({ kind: 'double_bottom', direction: 'bullish',
               startTime: a.time, endTime: c.time, markerTime: c.time,
               neckline, confidence: confirmed ? 0.7 : 0.5 });
  }
  return out;
}
```

## 非目標（MVP）

- 出来高確認、上位足整合は段階拡張
- 底 1 と底 2 の「戻り幅」要件は簡易チェックのみ（必要なら `minSwingPct` で代用）
