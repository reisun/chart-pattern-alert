import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";

/**
 * Detect Double Bottom (W-shape) from pivots.
 *
 * Looks for the last triplet [low, high, low] among pivots where:
 *   - both lows are roughly equal (within `doubleBottomTolPct`)
 *   - the middle high is sufficiently above (>= minSwingPct * low)
 *   - distance between lows is within [patternMinBars, patternMaxBars]
 *
 * Confirmation: last candle's close > neckline * (1 + necklineTolPct) → confidence 0.7
 * Tentative: otherwise → confidence 0.5 (still reported; UI can choose to ignore)
 */
export function detectDoubleBottom(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
): DetectedPattern[] {
  if (candles.length === 0 || pivots.length < 3) return [];

  const out: DetectedPattern[] = [];

  for (let i = 2; i < pivots.length; i++) {
    const a = pivots[i - 2];
    const b = pivots[i - 1];
    const c = pivots[i];
    if (a.kind !== "low" || b.kind !== "high" || c.kind !== "low") continue;

    const bars = c.idx - a.idx;
    if (bars < cfg.patternMinBars || bars > cfg.patternMaxBars) continue;

    const lowsGap = Math.abs(c.price - a.price) / a.price;
    if (lowsGap > cfg.doubleBottomTolPct) continue;

    const liftPct = (b.price - Math.max(a.price, c.price)) / Math.max(a.price, c.price);
    if (liftPct < cfg.minSwingPct) continue;

    const neckline = b.price;
    const last = candles[candles.length - 1];
    const confirmed = last.close > neckline * (1 + cfg.necklineTolPct);

    out.push({
      id: makeId("double_bottom", c.time, neckline),
      kind: "double_bottom",
      direction: "bullish",
      confidence: confirmed ? 0.7 : 0.5,
      startTime: a.time,
      endTime: c.time,
      markerTime: c.time,
      neckline,
      note: confirmed ? "neckline breakout" : "tentative",
    });
  }

  return out;
}

function makeId(kind: string, markerTime: number, neckline: number): string {
  const n = Math.round(neckline * 1000);
  return `${kind}:${markerTime}:${n}`;
}
