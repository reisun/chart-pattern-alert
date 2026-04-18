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

export type PatternKind =
  | "double_bottom"
  | "double_top"
  | "inverse_head_and_shoulders"
  | "head_and_shoulders"
  | "ascending_flag"
  | "descending_flag"
  | "ascending_triangle"
  | "descending_triangle"
  | "flip_up"
  | "flip_down";

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
  shoulderBalance: number; // 0.2
  flagPoleMinPct: number; // 0.03
  flagSlopeMax: number; // radians (~0.524 = 30°)
  flagParallelTol: number; // radians (~0.262 = 15°)
  flagMinBars: number; // 5
  flagMaxBars: number; // 25
  triHorizTol: number; // 0.001
  triSlopeMin: number; // 0.001
  triMinTouches: number; // 2
  triMinBars: number; // 15
  triMaxBars: number; // 60
  lineTouchMin: number; // 2
  lineRetestTol: number; // 0.003
  retestMaxBars: number; // 10
}
