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
import type { Candle, DetectedPattern, PatternConfig } from "./types";

export { defaultPatternConfig } from "./config";
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
  const pivots = findPivots(candles, cfg.minSwingPct);
  const results: DetectedPattern[] = [
    ...detectDoubleBottom(candles, pivots, cfg),
    ...detectDoubleTop(candles, pivots, cfg),
    ...detectInverseHeadAndShoulders(candles, pivots, cfg),
    ...detectHeadAndShoulders(candles, pivots, cfg),
    ...detectAscendingFlag(candles, cfg),
    ...detectDescendingFlag(candles, cfg),
    ...detectAscendingTriangle(candles, pivots, cfg),
    ...detectDescendingTriangle(candles, pivots, cfg),
    ...detectFlipUp(candles, pivots, cfg),
    ...detectFlipDown(candles, pivots, cfg),
  ];
  const seen = new Set<string>();
  return results.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
