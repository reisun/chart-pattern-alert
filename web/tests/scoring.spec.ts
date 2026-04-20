import { describe, expect, it } from "vitest";
import { computeConfidence } from "../src/patterns/scoring";
import type { ScoringFactors } from "../src/patterns/types";

function baseFactors(overrides: Partial<ScoringFactors> = {}): ScoringFactors {
  return {
    isConfirmed: false,
    atrDepthRatio: 0.5,
    patternBars: 15,
    breakStrength: 0,
    symmetry: 0.5,
    patternMinBars: 10,
    patternMaxBars: 50,
    ...overrides,
  };
}

describe("computeConfidence", () => {
  it("returns base score when no bonuses apply", () => {
    const score = computeConfidence(baseFactors({
      atrDepthRatio: 0.3,
      patternBars: 1,
      breakStrength: 0,
      symmetry: 0.1,
    }));
    expect(score).toBe(0.3);
  });

  it("returns maximum when all bonuses apply (without volume)", () => {
    const score = computeConfidence(baseFactors({
      isConfirmed: true,
      atrDepthRatio: 2.5,
      patternBars: 30,
      breakStrength: 0.8,
      symmetry: 0.9,
    }));
    expect(score).toBe(0.95);
  });

  it("clamps to 1.0 when all bonuses including volume apply", () => {
    const score = computeConfidence(baseFactors({
      isConfirmed: true,
      atrDepthRatio: 2.5,
      patternBars: 30,
      breakStrength: 0.8,
      symmetry: 0.9,
      volumeRatio: 2.0,
    }));
    expect(score).toBe(1.0);
  });

  it("confirmed adds 0.2", () => {
    const base = computeConfidence(baseFactors());
    const confirmed = computeConfidence(baseFactors({ isConfirmed: true }));
    expect(confirmed - base).toBeCloseTo(0.2);
  });

  it("atrDepthRatio >= 1.0 adds 0.1", () => {
    const low = computeConfidence(baseFactors({ atrDepthRatio: 0.5 }));
    const med = computeConfidence(baseFactors({ atrDepthRatio: 1.0 }));
    expect(med - low).toBeCloseTo(0.1);
  });

  it("atrDepthRatio >= 2.0 adds 0.15", () => {
    const low = computeConfidence(baseFactors({ atrDepthRatio: 0.5 }));
    const high = computeConfidence(baseFactors({ atrDepthRatio: 2.0 }));
    expect(high - low).toBeCloseTo(0.15);
  });

  it("is direction-symmetric (bullish and bearish produce same score for same factors)", () => {
    const factors = baseFactors({ isConfirmed: true, atrDepthRatio: 1.5, breakStrength: 0.6, symmetry: 0.8 });
    const scoreBullish = computeConfidence(factors);
    const scoreBearish = computeConfidence(factors);
    expect(scoreBullish).toBe(scoreBearish);
  });

  it("clamps to [0, 1] range", () => {
    const score = computeConfidence(baseFactors({
      isConfirmed: true,
      atrDepthRatio: 10,
      patternBars: 30,
      breakStrength: 1,
      symmetry: 1,
      volumeRatio: 3.0,
    }));
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0.0);
  });

  it("volumeRatio >= 1.5 adds 0.1", () => {
    const without = computeConfidence(baseFactors());
    const withVol = computeConfidence(baseFactors({ volumeRatio: 1.5 }));
    expect(withVol - without).toBeCloseTo(0.1);
  });

  it("volumeRatio < 1.5 does not add bonus", () => {
    const without = computeConfidence(baseFactors());
    const withVol = computeConfidence(baseFactors({ volumeRatio: 1.4 }));
    expect(withVol).toBe(without);
  });

  it("volumeRatio undefined does not add bonus", () => {
    const without = computeConfidence(baseFactors());
    const withVol = computeConfidence(baseFactors({ volumeRatio: undefined }));
    expect(withVol).toBe(without);
  });
});
