import type { PatternConfig } from "./types";

export const defaultPatternConfig: PatternConfig = {
  minSwingPct: 0.015,
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
  atrPeriod: 14,
  pivotMinATR: 0.8,
  pivotMinBars: 5,
  cooldownBars: 10,
  minConfidence: 0.6,
  candidateMinConfidence: 0.3,
  flagPoleMinATR: 2.0,
  doubleMinDepthATR: 1.0,
};

// 時間足ごとのオーバーライド（Partial）
const INTERVAL_OVERRIDES: Record<string, Partial<PatternConfig>> = {
  "1m": {
    minSwingPct: 0.005,
    pivotMinATR: 1.5,
    patternMinBars: 8,
    patternMaxBars: 30,
    cooldownBars: 20,
    minConfidence: 0.7,
  },
  "5m": {
    minSwingPct: 0.008,
    pivotMinATR: 1.2,
    patternMinBars: 8,
    patternMaxBars: 40,
    cooldownBars: 15,
  },
  "15m": {
    minSwingPct: 0.012,
    pivotMinATR: 1.0,
    patternMinBars: 10,
    patternMaxBars: 50,
    cooldownBars: 12,
  },
  "30m": {
    minSwingPct: 0.012,
    pivotMinATR: 0.9,
    patternMinBars: 10,
    patternMaxBars: 50,
    cooldownBars: 10,
  },
  "1h": {
    // defaultPatternConfig と同じ値が多いのでオーバーライド最小
  },
  "4h": {
    patternMinBars: 8,
    patternMaxBars: 40,
    cooldownBars: 8,
  },
  "1d": {
    minSwingPct: 0.020,
    pivotMinATR: 0.6,
    patternMinBars: 8,
    patternMaxBars: 40,
    cooldownBars: 5,
  },
  "1wk": {
    minSwingPct: 0.025,
    pivotMinATR: 0.5,
    patternMinBars: 6,
    patternMaxBars: 30,
    cooldownBars: 3,
  },
};

export function resolveConfig(interval: string): PatternConfig {
  return { ...defaultPatternConfig, ...(INTERVAL_OVERRIDES[interval] ?? {}) };
}
