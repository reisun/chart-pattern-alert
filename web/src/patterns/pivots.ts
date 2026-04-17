import type { Candle, Pivot } from "./types";

/**
 * Simple Zig-Zag pivot detection.
 *
 * Walks candles from left to right, toggling between expected-high and expected-low
 * once price has reversed by at least `minSwingPct` from the last extreme.
 *
 * Pivots alternate strictly: high, low, high, low, ...
 * The price used is `candle.high` for highs and `candle.low` for lows.
 */
export function findPivots(candles: Candle[], minSwingPct: number): Pivot[] {
  if (candles.length === 0) return [];

  const pivots: Pivot[] = [];
  let extIdx = 0;
  let extPrice = candles[0].high; // start assuming we'll look down from an initial high
  let expecting: "high" | "low" = "high";

  // Decide initial direction by looking at the first few bars.
  // If first candle's low reaches below open+close range by a lot, treat as started at a low.
  // Simpler: pick the higher of open/close as initial pivot ref; this is a heuristic only
  // for the very first bar. The loop below will self-correct after the first swing.

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (expecting === "high") {
      // Still trending up — track the running high, don't call a reversal yet.
      if (c.high > extPrice) {
        extIdx = i;
        extPrice = c.high;
        continue;
      }
      // Reversal: the current candle retreated from the tracked high by >= minSwingPct.
      if ((extPrice - c.low) / extPrice >= minSwingPct) {
        pivots.push({ idx: extIdx, time: candles[extIdx].time, price: extPrice, kind: "high" });
        expecting = "low";
        extIdx = i;
        extPrice = c.low;
      }
    } else {
      // Still trending down — track the running low.
      if (c.low < extPrice) {
        extIdx = i;
        extPrice = c.low;
        continue;
      }
      if ((c.high - extPrice) / extPrice >= minSwingPct) {
        pivots.push({ idx: extIdx, time: candles[extIdx].time, price: extPrice, kind: "low" });
        expecting = "high";
        extIdx = i;
        extPrice = c.high;
      }
    }
  }

  return pivots;
}

/**
 * Helper: last-N pivots filtered by kind(s).
 */
export function lastPivots(pivots: Pivot[], n: number): Pivot[] {
  if (pivots.length <= n) return pivots.slice();
  return pivots.slice(pivots.length - n);
}
