import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";
import { linearRegression, lineAt } from "./regression";

export function detectAscendingTriangle(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
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
      const last = candles[candles.length - 1];
      const confirmed = last.close > resistance * (1 + cfg.necklineTolPct);

      out.push({
        id: makeId("ascending_triangle", pivots[end].time, resistance),
        kind: "ascending_triangle",
        direction: "bullish",
        confidence: confirmed ? 0.7 : 0.5,
        startTime: pivots[start].time,
        endTime: pivots[end].time,
        markerTime: pivots[end].time,
        neckline: resistance,
        note: confirmed ? "resistance breakout" : "tentative",
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
