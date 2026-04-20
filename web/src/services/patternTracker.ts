import type { Candle } from "../patterns/types";
import type { PatternLogEntry } from "./patternLog";

/** ATR-based success/failure targets */
export function computeTargets(entry: PatternLogEntry): { successTarget: number; failTarget: number } {
  const atr = entry.atrAtDetection;
  const price = entry.evalStartPrice;
  if (entry.direction === "bullish") {
    return { successTarget: price + 2 * atr, failTarget: price - 1 * atr };
  }
  return { successTarget: price - 2 * atr, failTarget: price + 1 * atr };
}

/** Pattern-size-based evaluation window (1.5x pattern bars, clamped 20..100) */
export function computeEvalWindow(patternBars: number): number {
  return Math.min(100, Math.max(20, Math.round(patternBars * 1.5)));
}

/** Convert interval string to seconds per bar */
export function intervalToSeconds(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
    "1wk": 604800,
  };
  return map[interval] ?? 86400;
}

/** Update tracking for one candle tick */
export function updateTracking(entry: PatternLogEntry, candle: Candle): PatternLogEntry {
  if (entry.outcome !== "tracking") return entry;

  const atr = entry.atrAtDetection;
  if (atr <= 0) return { ...entry, outcome: "expired" };

  const price = candle.close;
  const excursion = (price - entry.evalStartPrice) / atr;
  const favorable = entry.direction === "bullish" ? excursion : -excursion;
  const adverse = -favorable;

  const updated: PatternLogEntry = {
    ...entry,
    mfe: Math.max(entry.mfe, favorable),
    mae: Math.max(entry.mae, adverse),
    barsElapsed: entry.barsElapsed + 1,
  };

  // Success check (direction-symmetric)
  if (entry.direction === "bullish" && price >= entry.successTarget) {
    return { ...updated, outcome: "success" as const, outcomeAt: candle.time };
  }
  if (entry.direction === "bearish" && price <= entry.successTarget) {
    return { ...updated, outcome: "success" as const, outcomeAt: candle.time };
  }

  // Failure check (direction-symmetric)
  if (entry.direction === "bullish" && price <= entry.failTarget) {
    return { ...updated, outcome: "fail" as const, outcomeAt: candle.time };
  }
  if (entry.direction === "bearish" && price >= entry.failTarget) {
    return { ...updated, outcome: "fail" as const, outcomeAt: candle.time };
  }

  // Window expired
  if (updated.barsElapsed >= entry.evalWindowBars) {
    return { ...updated, outcome: "expired" as const, outcomeAt: candle.time };
  }

  return updated;
}
