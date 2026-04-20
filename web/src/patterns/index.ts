import { detectDoubleBottom } from "./doubleBottom";
import { detectDoubleTop } from "./doubleTop";
import { detectInverseHeadAndShoulders } from "./inverseHeadAndShoulders";
import { detectHeadAndShoulders } from "./headAndShoulders";
import { detectAscendingFlag } from "./ascendingFlag";
import { detectDescendingFlag } from "./descendingFlag";
import { detectAscendingTriangle } from "./ascendingTriangle";
import { detectDescendingTriangle } from "./descendingTriangle";
import { detectFlipUp } from "./flipUp";
import { detectFlipDown } from "./flipDown";
import { findPivots } from "./pivots";
import { calcATR } from "./atr";
import type { Candle, DetectedPattern, PatternConfig } from "./types";

export { defaultPatternConfig } from "./config";
export { calcATR } from "./atr";
export { computeConfidence } from "./scoring";
export {
  findPivots,
  detectDoubleBottom,
  detectDoubleTop,
  detectInverseHeadAndShoulders,
  detectHeadAndShoulders,
  detectAscendingFlag,
  detectDescendingFlag,
  detectAscendingTriangle,
  detectDescendingTriangle,
  detectFlipUp,
  detectFlipDown,
};
export type {
  Candle,
  DetectedPattern,
  PatternConfig,
  PatternKind,
  PatternDirection,
  PatternStatus,
  ScoringFactors,
  Pivot,
  PivotKind,
} from "./types";

export function detectAll(candles: Candle[], cfg: PatternConfig): DetectedPattern[] {
  if (candles.length === 0) return [];

  const atr = calcATR(candles, cfg.atrPeriod);
  const pivots = findPivots(candles, cfg.minSwingPct, atr, cfg.pivotMinATR, cfg.pivotMinBars);

  const results: DetectedPattern[] = [
    ...detectDoubleBottom(candles, pivots, cfg, atr),
    ...detectDoubleTop(candles, pivots, cfg, atr),
    ...detectInverseHeadAndShoulders(candles, pivots, cfg, atr),
    ...detectHeadAndShoulders(candles, pivots, cfg, atr),
    ...detectAscendingFlag(candles, cfg, atr),
    ...detectDescendingFlag(candles, cfg, atr),
    ...detectAscendingTriangle(candles, pivots, cfg, atr),
    ...detectDescendingTriangle(candles, pivots, cfg, atr),
    ...detectFlipUp(candles, pivots, cfg, atr),
    ...detectFlipDown(candles, pivots, cfg, atr),
  ];

  const seen = new Set<string>();
  const deduped = results.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const filtered = deduped.filter((p) => {
    if (p.status === "confirmed") return p.confidence >= cfg.minConfidence;
    return p.confidence >= cfg.candidateMinConfidence;
  });

  const cooled = applyCooldown(filtered);

  cooled.sort((a, b) => a.markerTime - b.markerTime);

  return cooled;
}

function applyCooldown(patterns: DetectedPattern[]): DetectedPattern[] {
  const byKind = new Map<string, DetectedPattern[]>();
  for (const p of patterns) {
    const arr = byKind.get(p.kind) ?? [];
    arr.push(p);
    byKind.set(p.kind, arr);
  }

  const kept: DetectedPattern[] = [];

  for (const [, group] of byKind) {
    group.sort((a, b) => a.markerTime - b.markerTime);

    const selected: DetectedPattern[] = [];
    for (const p of group) {
      if (selected.length === 0) {
        selected.push(p);
        continue;
      }
      const last = selected[selected.length - 1];
      if (p.startTime <= last.endTime) {
        if (p.confidence > last.confidence) {
          selected[selected.length - 1] = p;
        }
      } else {
        selected.push(p);
      }
    }
    kept.push(...selected);
  }

  return kept;
}
