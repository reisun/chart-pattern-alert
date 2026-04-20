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

export const ALL_PATTERN_KINDS: PatternKind[] = [
  "double_bottom",
  "double_top",
  "inverse_head_and_shoulders",
  "head_and_shoulders",
  "ascending_flag",
  "descending_flag",
  "ascending_triangle",
  "descending_triangle",
  "flip_up",
  "flip_down",
];

export const PATTERN_LABELS: Record<PatternKind, string> = {
  double_bottom: "ダブルボトム",
  double_top: "ダブルトップ",
  inverse_head_and_shoulders: "逆三尊",
  head_and_shoulders: "三尊",
  ascending_flag: "上昇フラッグ",
  descending_flag: "下降フラッグ",
  ascending_triangle: "上昇トライアングル",
  descending_triangle: "下降トライアングル",
  flip_up: "レジサポ転換↑",
  flip_down: "サポレジ転換↓",
};

export const PATTERN_SHORT_LABELS: Record<PatternKind, string> = {
  double_bottom: "Wボトム",
  double_top: "Mトップ",
  inverse_head_and_shoulders: "逆三尊",
  head_and_shoulders: "三尊",
  ascending_flag: "上昇F",
  descending_flag: "下降F",
  ascending_triangle: "上昇△",
  descending_triangle: "下降▽",
  flip_up: "転換↑",
  flip_down: "転換↓",
};

export type PatternStatus = "candidate" | "confirmed" | "invalidated";

export interface ScoringFactors {
  isConfirmed: boolean;
  atrDepthRatio: number;
  patternBars: number;
  breakStrength: number;
  symmetry: number;
  patternMinBars: number;
  patternMaxBars: number;
}

export interface DetectedPattern {
  id: string; // stable hash of kind+symbol+markerTime+neckline bucket
  kind: PatternKind;
  direction: PatternDirection;
  confidence: number; // 0..1
  status: PatternStatus;
  startTime: number;
  endTime: number;
  markerTime: number;
  neckline?: number;
  note?: string;
  detectedAt: number;
  confirmedAt?: number;
  entryPrice?: number;
  atrAtDetection: number;
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
  atrPeriod: number; // 14
  pivotMinATR: number; // 0.8 (pivot spacing: min price diff as ATR multiple)
  pivotMinBars: number; // 5 (pivot spacing: min bars between pivots)
  cooldownBars: number; // 10 (same-kind signal cooldown)
  minConfidence: number; // 0.6 (display threshold for confirmed)
  candidateMinConfidence: number; // 0.3 (display threshold for candidate)
  flagPoleMinATR: number; // 2.0 (flag pole min length as ATR multiple)
  doubleMinDepthATR: number; // 1.0 (double top/bottom mid-peak depth as ATR multiple)
}
