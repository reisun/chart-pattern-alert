import type { PatternConfig } from "./types";

export const defaultPatternConfig: PatternConfig = {
  minSwingPct: 0.003,
  patternMinBars: 10,
  patternMaxBars: 50,
  necklineTolPct: 0.002,
  doubleBottomTolPct: 0.015,
  doubleTopTolPct: 0.015,
  shoulderBalance: 0.2,
  flagPoleMinPct: 0.03,
  flagSlopeMax: (30 * Math.PI) / 180,
  flagParallelTol: (15 * Math.PI) / 180,
  flagMinBars: 5,
  flagMaxBars: 25,
  triHorizTol: 0.001,
  triSlopeMin: 0.001,
  triMinTouches: 2,
  triMinBars: 15,
  triMaxBars: 60,
  lineTouchMin: 2,
  lineRetestTol: 0.003,
  retestMaxBars: 10,
};
