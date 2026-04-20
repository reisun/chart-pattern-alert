import type { Candle, DetectedPattern, PatternConfig, Pivot } from "./types";
import { computeConfidence } from "./scoring";
import { volumeRatio } from "./volume";
import { linearRegression, lineAt } from "./regression";

export function detectFlipUp(
  candles: Candle[],
  pivots: Pivot[],
  cfg: PatternConfig,
  atr?: number,
): DetectedPattern[] {
  if (candles.length === 0) return [];

  const highs = pivots.filter((p) => p.kind === "high");
  if (highs.length < cfg.lineTouchMin) return [];

  const out: DetectedPattern[] = [];

  for (let end = highs.length - 1; end >= cfg.lineTouchMin - 1; end--) {
    for (let start = end - cfg.lineTouchMin + 1; start >= 0; start--) {
      const touchPivots = highs.slice(start, end + 1);
      if (touchPivots.length < cfg.lineTouchMin) continue;

      const bars = touchPivots[touchPivots.length - 1].idx - touchPivots[0].idx;
      if (bars < cfg.patternMinBars || bars > cfg.patternMaxBars) continue;

      const xs = touchPivots.map((p) => p.idx);
      const ys = touchPivots.map((p) => p.price);
      const reg = linearRegression(xs, ys);

      if (reg.slope >= 0) continue;

      let allClose = true;
      for (const p of touchPivots) {
        const expected = lineAt(reg, p.idx);
        if (Math.abs(p.price - expected) / expected > cfg.lineRetestTol * 2) {
          allClose = false;
          break;
        }
      }
      if (!allClose) continue;

      const lastTouchIdx = touchPivots[touchPivots.length - 1].idx;
      let breakIdx = -1;
      for (let i = lastTouchIdx + 1; i < candles.length; i++) {
        const lineVal = lineAt(reg, i);
        if (candles[i].close > lineVal * (1 + cfg.necklineTolPct)) {
          breakIdx = i;
          break;
        }
      }
      if (breakIdx === -1) continue;

      let retestSuccess = false;
      const retestEnd = Math.min(breakIdx + cfg.retestMaxBars, candles.length - 1);
      for (let i = breakIdx + 1; i <= retestEnd; i++) {
        const lineVal = lineAt(reg, i);
        if (Math.abs(candles[i].low - lineVal) / lineVal <= cfg.lineRetestTol) {
          if (candles[i].close > lineVal) {
            retestSuccess = true;
            break;
          }
        }
      }

      const lineAtBreak = lineAt(reg, breakIdx);
      const last = candles[candles.length - 1];
      const confirmed = retestSuccess;
      const safeAtr = atr != null && atr > 0 ? atr : 1;
      const touchCount = touchPivots.length;

      const confidence = computeConfidence({
        isConfirmed: confirmed,
        atrDepthRatio: Math.abs(last.close - lineAtBreak) / safeAtr,
        patternBars: bars,
        breakStrength: Math.abs(candles[breakIdx].close - lineAtBreak) / safeAtr,
        symmetry: Math.min(1, touchCount / cfg.lineTouchMin),
        patternMinBars: cfg.patternMinBars,
        patternMaxBars: cfg.patternMaxBars,
        volumeRatio: volumeRatio(candles, candles.length - 1),
      });

      out.push({
        id: makeId("flip_up", candles[breakIdx].time, lineAtBreak),
        kind: "flip_up",
        direction: "bullish",
        confidence,
        status: confirmed ? "confirmed" : "candidate",
        startTime: candles[touchPivots[0].idx].time,
        endTime: candles[breakIdx].time,
        markerTime: candles[breakIdx].time,
        neckline: lineAtBreak,
        note: confirmed ? "retest confirmed" : "tentative",
        detectedAt: last.time,
        confirmedAt: confirmed ? last.time : undefined,
        entryPrice: confirmed ? candles[breakIdx].close : undefined,
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
