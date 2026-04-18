import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";

export function detectInverseHeadAndShoulders(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
): DetectedPattern[] {
  if (candles.length === 0 || pivots.length < 5) return [];

  const out: DetectedPattern[] = [];

  for (let i = 4; i < pivots.length; i++) {
    const ls = pivots[i - 4]; // left shoulder (low)
    const ln = pivots[i - 3]; // left neckline (high)
    const head = pivots[i - 2]; // head (low)
    const rn = pivots[i - 1]; // right neckline (high)
    const rs = pivots[i]; // right shoulder (low)

    if (ls.kind !== "low" || ln.kind !== "high" || head.kind !== "low" || rn.kind !== "high" || rs.kind !== "low")
      continue;

    const bars = rs.idx - ls.idx;
    if (bars < 30 || bars > 80) continue;

    if (ls.price <= head.price || rs.price <= head.price) continue;

    const shoulderDiff = Math.abs(ls.price - rs.price) / head.price;
    if (shoulderDiff > cfg.shoulderBalance) continue;

    // Symmetry check: left/right side bar spans must not be too asymmetric
    const leftBars = head.idx - ls.idx;
    const rightBars = rs.idx - head.idx;
    if (leftBars > 0 && rightBars > 0) {
      const ratio = Math.max(leftBars, rightBars) / Math.min(leftBars, rightBars);
      if (ratio > 3.0) continue;
    }

    const neckline = Math.max(ln.price, rn.price);
    const last = candles[candles.length - 1];
    const confirmed = last.close > neckline * (1 + cfg.necklineTolPct);

    out.push({
      id: makeId("inverse_head_and_shoulders", rs.time, neckline),
      kind: "inverse_head_and_shoulders",
      direction: "bullish",
      confidence: confirmed ? 0.7 : 0.5,
      startTime: ls.time,
      endTime: rs.time,
      markerTime: rs.time,
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
