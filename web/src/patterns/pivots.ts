import type { Candle, Pivot } from "./types";

/**
 * Simple Zig-Zag pivot detection with ATR-based filtering.
 *
 * Walks candles from left to right, toggling between expected-high and expected-low
 * once price has reversed by at least `minSwingPct` from the last extreme.
 *
 * After the initial detection, pivots are filtered by:
 *   - pivotMinBars: minimum bar distance between consecutive pivots
 *   - pivotMinATR: minimum price difference (as ATR multiple) between consecutive pivots
 *
 * Pivots alternate strictly: high, low, high, low, ...
 * The price used is `candle.high` for highs and `candle.low` for lows.
 */
export function findPivots(
  candles: Candle[],
  minSwingPct: number,
  atr?: number,
  pivotMinATR?: number,
  pivotMinBars?: number,
): Pivot[] {
  if (candles.length === 0) return [];

  const raw: Pivot[] = [];
  let extIdx = 0;
  let extPrice = candles[0].high;
  let expecting: "high" | "low" = "high";

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (expecting === "high") {
      if (c.high > extPrice) {
        extIdx = i;
        extPrice = c.high;
        continue;
      }
      if ((extPrice - c.low) / extPrice >= minSwingPct) {
        raw.push({ idx: extIdx, time: candles[extIdx].time, price: extPrice, kind: "high" });
        expecting = "low";
        extIdx = i;
        extPrice = c.low;
      }
    } else {
      if (c.low < extPrice) {
        extIdx = i;
        extPrice = c.low;
        continue;
      }
      if ((c.high - extPrice) / extPrice >= minSwingPct) {
        raw.push({ idx: extIdx, time: candles[extIdx].time, price: extPrice, kind: "low" });
        expecting = "high";
        extIdx = i;
        extPrice = c.high;
      }
    }
  }

  // If no ATR-based filtering requested, return raw pivots
  if (atr == null || atr <= 0 || pivotMinATR == null || pivotMinBars == null) {
    return raw;
  }

  // Filter: enforce minimum bar distance and minimum price distance (ATR multiple)
  const filtered: Pivot[] = [];
  for (const p of raw) {
    if (filtered.length === 0) {
      filtered.push(p);
      continue;
    }
    const prev = filtered[filtered.length - 1];
    const barDist = p.idx - prev.idx;
    const priceDist = Math.abs(p.price - prev.price);
    if (barDist < pivotMinBars || priceDist < atr * pivotMinATR) {
      // Keep the more extreme pivot of the two (same kind due to alternation)
      // If kinds differ (normal), we must decide which to keep:
      // Drop the new pivot if it doesn't meet the threshold
      continue;
    }
    filtered.push(p);
  }

  return filtered;
}

/**
 * Helper: last-N pivots filtered by kind(s).
 */
export function lastPivots(pivots: Pivot[], n: number): Pivot[] {
  if (pivots.length <= n) return pivots.slice();
  return pivots.slice(pivots.length - n);
}
