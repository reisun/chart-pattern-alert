import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";

/**
 * Detect Double Top (M-shape). Symmetric of Double Bottom.
 */
export function detectDoubleTop(
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
    if (a.kind !== "high" || b.kind !== "low" || c.kind !== "high") continue;

    const bars = c.idx - a.idx;
    if (bars < cfg.patternMinBars || bars > cfg.patternMaxBars) continue;

    const highsGap = Math.abs(c.price - a.price) / a.price;
    if (highsGap > cfg.doubleTopTolPct) continue;

    const dropPct = (Math.min(a.price, c.price) - b.price) / Math.min(a.price, c.price);
    if (dropPct < cfg.minSwingPct) continue;

    const neckline = b.price;
    const last = candles[candles.length - 1];
    const confirmed = last.close < neckline * (1 - cfg.necklineTolPct);

    out.push({
      id: makeId("double_top", c.time, neckline),
      kind: "double_top",
      direction: "bearish",
      confidence: confirmed ? 0.7 : 0.5,
      startTime: a.time,
      endTime: c.time,
      markerTime: c.time,
      neckline,
      note: confirmed ? "neckline breakdown" : "tentative",
    });
  }

  return out;
}

function makeId(kind: string, markerTime: number, neckline: number): string {
  const n = Math.round(neckline * 1000);
  return `${kind}:${markerTime}:${n}`;
}
