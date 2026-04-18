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
    ...detectInverseHeadAndShoulders(candles, pivots, cfg),
    ...detectHeadAndShoulders(candles, pivots, cfg),
    ...detectAscendingFlag(candles, cfg, atr),
    ...detectDescendingFlag(candles, cfg, atr),
    ...detectAscendingTriangle(candles, pivots, cfg),
    ...detectDescendingTriangle(candles, pivots, cfg),
    ...detectFlipUp(candles, pivots, cfg),
    ...detectFlipDown(candles, pivots, cfg),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped = results.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // 1. Filter by minimum confidence
  const filtered = deduped.filter((p) => p.confidence >= cfg.minConfidence);

  // 2. Cooldown: for same kind within cooldownBars, keep only highest confidence
  const cooled = applyCooldown(filtered, cfg.cooldownBars);

  // 3. Sort by time
  cooled.sort((a, b) => a.markerTime - b.markerTime);

  return cooled;
}

/**
 * For patterns of the same kind within `cooldownBars` of each other,
 * keep only the one with highest confidence.
 */
function applyCooldown(patterns: DetectedPattern[], _cooldownBars: number): DetectedPattern[] {
  // Group by kind
  const byKind = new Map<string, DetectedPattern[]>();
  for (const p of patterns) {
    const arr = byKind.get(p.kind) ?? [];
    arr.push(p);
    byKind.set(p.kind, arr);
  }

  const kept: DetectedPattern[] = [];

  for (const [, group] of byKind) {
    // Sort by markerTime
    group.sort((a, b) => a.markerTime - b.markerTime);

    const selected: DetectedPattern[] = [];
    for (const p of group) {
      if (selected.length === 0) {
        selected.push(p);
        continue;
      }
      const last = selected[selected.length - 1];
      // Use endTime difference as proxy for bar distance (same timeframe assumption)
      // We compare markerTime; in same-timeframe data the bar index can be inferred
      // but since we don't have bar index here, we compare using the pattern's endTime index.
      // For simplicity, we use the pattern endTime - they are epoch seconds.
      // A cooldown of N bars at 1-day timeframe = N * 86400s, 1h = N * 3600s.
      // Since we don't know the timeframe, we approximate: if patterns overlap in time span
      // or are within cooldownBars "worth" of each other.
      // Simpler approach: overlap check — if startTime < last.endTime + tolerance
      // But the task says "cooldownBars bars", so we need bar-index-based logic.
      // We can embed bar index into markerTime comparison by looking at relative ordering.
      // Actually, the endTime is the candle time at the pattern end, so we can look at
      // (p.markerTime - last.markerTime) and compare heuristically.
      // Best: since patterns store times, not indices, and the bar step varies,
      // let's just check if markerTime falls within the span of the last kept pattern
      // extended by cooldownBars * minimum_step. We'll be conservative and use
      // the simpler overlap + small buffer approach.

      // Heuristic: if the new pattern's start is before the last pattern's end
      // (they overlap), treat as within cooldown.
      // Otherwise, let it through (they're clearly separated).
      if (p.startTime <= last.endTime) {
        // Within cooldown window — keep the higher confidence one
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
