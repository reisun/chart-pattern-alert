import type { PatternConfig } from "./types";

export const defaultPatternConfig: PatternConfig = {
  minSwingPct: 0.003,
  patternMinBars: 10,
  patternMaxBars: 50,
  necklineTolPct: 0.002,
  doubleBottomTolPct: 0.015,
  doubleTopTolPct: 0.015,
};
