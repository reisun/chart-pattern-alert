import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";
import { computeConfidence } from "./scoring";
import { volumeRatio } from "./volume";

export function detectHeadAndShoulders(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
  atr?: number,
): DetectedPattern[] {
  if (candles.length === 0 || pivots.length < 5) return [];

  const out: DetectedPattern[] = [];

  for (let i = 4; i < pivots.length; i++) {
    const ls = pivots[i - 4];
    const ln = pivots[i - 3];
    const head = pivots[i - 2];
    const rn = pivots[i - 1];
    const rs = pivots[i];

    if (ls.kind !== "high" || ln.kind !== "low" || head.kind !== "high" || rn.kind !== "low" || rs.kind !== "high")
      continue;

    const bars = rs.idx - ls.idx;
    if (bars < 30 || bars > 80) continue;

    if (ls.price >= head.price || rs.price >= head.price) continue;

    const shoulderDiff = Math.abs(ls.price - rs.price) / head.price;
    if (shoulderDiff > cfg.shoulderBalance) continue;

    const leftBars = head.idx - ls.idx;
    const rightBars = rs.idx - head.idx;
    if (leftBars > 0 && rightBars > 0) {
      const ratio = Math.max(leftBars, rightBars) / Math.min(leftBars, rightBars);
      if (ratio > 3.0) continue;
    }

    const neckline = Math.min(ln.price, rn.price);
    const last = candles[candles.length - 1];
    const confirmed = last.close < neckline * (1 - cfg.necklineTolPct);
    const safeAtr = atr != null && atr > 0 ? atr : 1;
    const headNeckDist = head.price - neckline;

    const confidence = computeConfidence({
      isConfirmed: confirmed,
      atrDepthRatio: headNeckDist / safeAtr,
      patternBars: bars,
      breakStrength: confirmed ? Math.abs(last.close - neckline) / safeAtr : 0,
      symmetry: headNeckDist > 0 ? Math.max(0, 1 - Math.abs(ls.price - rs.price) / headNeckDist) : 0,
      patternMinBars: 30,
      patternMaxBars: 80,
      volumeRatio: volumeRatio(candles, candles.length - 1),
    });

    out.push({
      id: makeId("head_and_shoulders", rs.time, neckline),
      kind: "head_and_shoulders",
      direction: "bearish",
      confidence,
      status: confirmed ? "confirmed" : "candidate",
      startTime: ls.time,
      endTime: rs.time,
      markerTime: rs.time,
      neckline,
      note: confirmed ? "neckline breakdown" : "tentative",
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
