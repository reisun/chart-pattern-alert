import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";
import { computeConfidence } from "./scoring";
import { volumeRatio } from "./volume";

export function detectDoubleBottom(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
  atr?: number,
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

    if (atr != null && atr > 0) {
      const depth = b.price - Math.max(a.price, c.price);
      if (depth < atr * cfg.doubleMinDepthATR) continue;
    }

    const neckline = b.price;
    const last = candles[candles.length - 1];
    const confirmed = last.close > neckline * (1 + cfg.necklineTolPct);
    const safeAtr = atr != null && atr > 0 ? atr : 1;
    const depth = b.price - Math.max(a.price, c.price);

    const confidence = computeConfidence({
      isConfirmed: confirmed,
      atrDepthRatio: depth / safeAtr,
      patternBars: bars,
      breakStrength: confirmed ? Math.abs(last.close - neckline) / safeAtr : 0,
      symmetry: Math.max(0, 1 - Math.abs(a.price - c.price) / safeAtr),
      patternMinBars: cfg.patternMinBars,
      patternMaxBars: cfg.patternMaxBars,
      volumeRatio: volumeRatio(candles, candles.length - 1),
    });

    out.push({
      id: makeId("double_bottom", c.time, neckline),
      kind: "double_bottom",
      direction: "bullish",
      confidence,
      status: confirmed ? "confirmed" : "candidate",
      startTime: a.time,
      endTime: c.time,
      markerTime: c.time,
      neckline,
      note: confirmed ? "neckline breakout" : "tentative",
      detectedAt: last.time,
      confirmedAt: confirmed ? last.time : undefined,
      entryPrice: confirmed ? last.close : undefined,
      atrAtDetection: atr ?? 0,
    });
  }

  return out;
}

function makeId(kind: string, markerTime: number, neckline: number): string {
  const n = Math.round(neckline * 1000);
  return `${kind}:${markerTime}:${n}`;
}
