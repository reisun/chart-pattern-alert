import type { ScoringFactors } from "./types";

export function computeConfidence(factors: ScoringFactors): number {
  let score = 0.3;

  if (factors.isConfirmed) score += 0.2;

  if (factors.atrDepthRatio >= 2.0) score += 0.15;
  else if (factors.atrDepthRatio >= 1.0) score += 0.1;

  const idealBars = (factors.patternMinBars + factors.patternMaxBars) / 2;
  const barRatio = factors.patternBars / idealBars;
  if (barRatio >= 0.5 && barRatio <= 1.5) score += 0.1;

  if (factors.breakStrength >= 0.5) score += 0.1;

  if (factors.symmetry >= 0.7) score += 0.1;

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));
}
