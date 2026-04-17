export interface Candle {
  time: number; // UTC epoch seconds (candle open time)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PivotKind = "high" | "low";

export interface Pivot {
  idx: number;
  time: number;
  price: number;
  kind: PivotKind;
}

export type PatternKind = "double_bottom" | "double_top";

export type PatternDirection = "bullish" | "bearish";

export interface DetectedPattern {
  id: string; // stable hash of kind+symbol+markerTime+neckline bucket
  kind: PatternKind;
  direction: PatternDirection;
  confidence: number; // 0..1
  startTime: number;
  endTime: number;
  markerTime: number;
  neckline?: number;
  note?: string;
}

export interface PatternConfig {
  minSwingPct: number; // 0.003
  patternMinBars: number; // 10
  patternMaxBars: number; // 50
  necklineTolPct: number; // 0.002
  doubleBottomTolPct: number; // 0.015
  doubleTopTolPct: number; // 0.015
}
