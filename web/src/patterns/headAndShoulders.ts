import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";

export function detectHeadAndShoulders(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
): DetectedPattern[] {
  if (candles.length === 0 || pivots.length < 5) return [];

  const out: DetectedPattern[] = [];

  for (let i = 4; i < pivots.length; i++) {
    const ls = pivots[i - 4]; // left shoulder (high)
    const ln = pivots[i - 3]; // left neckline (low)
    const head = pivots[i - 2]; // head (high)
    const rn = pivots[i - 1]; // right neckline (low)
    const rs = pivots[i]; // right shoulder (high)

    if (ls.kind !== "high" || ln.kind !== "low" || head.kind !== "high" || rn.kind !== "low" || rs.kind !== "high")
      continue;

    const bars = rs.idx - ls.idx;
    if (bars < 30 || bars > 80) continue;

    if (ls.price >= head.price || rs.price >= head.price) continue;

    const shoulderDiff = Math.abs(ls.price - rs.price) / head.price;
    if (shoulderDiff > cfg.shoulderBalance) continue;

    const neckline = Math.min(ln.price, rn.price);
    const last = candles[candles.length - 1];
    const confirmed = last.close < neckline * (1 - cfg.necklineTolPct);

    out.push({
      id: makeId("head_and_shoulders", rs.time, neckline),
      kind: "head_and_shoulders",
      direction: "bearish",
      confidence: confirmed ? 0.7 : 0.5,
      startTime: ls.time,
      endTime: rs.time,
      markerTime: rs.time,
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
