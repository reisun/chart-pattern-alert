# Double Top（ダブルトップ）★MVP

## 概要

**M 字**の形。高値を 2 回つけたが抜けきれず下へ向かう。

```
    頂1 ＊          ＊ 頂2
       / \        / \
      /   \      /   \
  ───＊    ＊──＊     ＊───  ← ネックライン(2 頂の間の安値)
            \  /
             \/
          中央の谷
```

## 意味合い

- 買いが 2 回試されたがもう上げきれない
- 天井圏の候補

## 見るポイント

- 2 つ目の頂で**大きく高値更新しない**
- 中央の谷を下抜けると売りシグナルとして強くなる（ネックライン割れ）

## 検出アルゴリズム（MVP）

入力: `Candle[]`

1. 極値検出の Pivot 列から `high, low, high` の並びを探す
2. ルール:
   - 頂 1, 頂 2 の価格差が `|high2 - high1| / high1 <= doubleTopTolPct`（既定 1.5%）
   - 中央の谷 `mid.low` が `min(high1, high2) * (1 - minSwingPct)` より十分低い
   - 頂 1 → 頂 2 の本数が `patternMinBars..patternMaxBars` 範囲内
3. 確定トリガ: 直近 `close < mid.low * (1 - necklineTolPct)`
4. 出力:
   - `kind: 'double_top'`, `direction: 'bearish'`
   - `markerTime = high2.time`, `neckline = mid.low`

## 閾値（既定）

| 名称               | 既定    |
|--------------------|---------|
| `doubleTopTolPct`  | 1.5%    |

共通閾値は [common.md](./common.md) 参照。

## マーカー

- 頂 2 の足の上に `arrowDown`、略号 `DT`
- 確定（ネックライン割れ）時は塗りつぶし、通知を発火

## 擬似コード

Double Bottom の対称形（high/low と比較演算を反転）。実装は同じヘルパを使い回し、パラメータで方向を指定可。

## 非目標（MVP）

- 出来高・上位足整合は段階拡張
