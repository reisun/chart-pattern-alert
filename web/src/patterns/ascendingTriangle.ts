import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";
import { computeConfidence } from "./scoring";
import { volumeRatio } from "./volume";
import { linearRegression, lineAt } from "./regression";

export function detectAscendingTriangle(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
  atr?: number,
): DetectedPattern[] {
  if (candles.length === 0 || pivots.length < 4) return [];

  const out: DetectedPattern[] = [];

  for (let end = pivots.length - 1; end >= 3; end--) {
    for (let start = end - 3; start >= 0; start--) {
      const span = pivots.slice(start, end + 1);
      const bars = pivots[end].idx - pivots[start].idx;
      if (bars < cfg.triMinBars || bars > cfg.triMaxBars) continue;

      const highs = span.filter((p) => p.kind === "high");
      const lows = span.filter((p) => p.kind === "low");
      if (highs.length < cfg.triMinTouches || lows.length < cfg.triMinTouches) continue;

      const hxs = highs.map((p) => p.idx);
      const hys = highs.map((p) => p.price);
      const lxs = lows.map((p) => p.idx);
      const lys = lows.map((p) => p.price);

      const regH = linearRegression(hxs, hys);
      const regL = linearRegression(lxs, lys);

      const avgPrice = hys.reduce((a, b) => a + b, 0) / hys.length;
      const normalizedSlopeH = regH.slope / avgPrice;
      const normalizedSlopeL = regL.slope / avgPrice;

      if (Math.abs(normalizedSlopeH) > cfg.triHorizTol) continue;
      if (normalizedSlopeL <= cfg.triSlopeMin) continue;

      const resistance = lineAt(regH, candles.length - 1);
      const support = lineAt(regL, candles.length - 1);
      const last = candles[candles.length - 1];
      const confirmed = last.close > resistance * (1 + cfg.necklineTolPct);
      const safeAtr = atr != null && atr > 0 ? atr : 1;
      const triHeight = resistance - support;
      const touchCount = Math.min(highs.length, lows.length);

      const confidence = computeConfidence({
        isConfirmed: confirmed,
        atrDepthRatio: triHeight > 0 ? triHeight / safeAtr : 0,
        patternBars: bars,
        breakStrength: confirmed ? Math.abs(last.close - resistance) / safeAtr : 0,
        symmetry: Math.min(1, touchCount / cfg.triMinTouches),
        patternMinBars: cfg.triMinBars,
        patternMaxBars: cfg.triMaxBars,
        volumeRatio: volumeRatio(candles, candles.length - 1),
      });

      out.push({
        id: makeId("ascending_triangle", pivots[end].time, resistance),
        kind: "ascending_triangle",
        direction: "bullish",
        confidence,
        status: confirmed ? "confirmed" : "candidate",
        startTime: pivots[start].time,
        endTime: pivots[end].time,
        markerTime: pivots[end].time,
        neckline: resistance,
        note: confirmed ? "resistance breakout" : "tentative",
        detectedAt: last.time,
        confirmedAt: confirmed ? last.time : undefined,
        entryPrice: confirmed ? last.close : undefined,
        atrAtDetection: atr ?? 0,
      });

      return out;
    }
  }

  return out;
}

function makeId(kind: string, markerTime: number, neckline: number): string {
  const n = Math.round(neckline * 1000);
  return `${kind}:${markerTime}:${n}`;
}
