import { detectDoubleBottom } from "./doubleBottom";
import { detectDoubleTop } from "./doubleTop";
import { findPivots } from "./pivots";
import type { Candle, DetectedPattern, PatternConfig } from "./types";

export { defaultPatternConfig } from "./config";
export { findPivots, detectDoubleBottom, detectDoubleTop };
export type {
  Candle,
  DetectedPattern,
  PatternConfig,
  PatternKind,
  PatternDirection,
  Pivot,
  PivotKind,
} from "./types";

/**
 * Run all enabled detectors against `candles` and return a merged list,
 * deduplicated by `DetectedPattern.id`.
 */
export function detectAll(candles: Candle[], cfg: PatternConfig): DetectedPattern[] {
  if (candles.length === 0) return [];
  const pivots = findPivots(candles, cfg.minSwingPct);
  const results: DetectedPattern[] = [
    ...detectDoubleBottom(candles, pivots, cfg),
    ...detectDoubleTop(candles, pivots, cfg),
  ];
  // dedupe by id keeping first occurrence
  const seen = new Set<string>();
  return results.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
