import { describe, expect, it } from "vitest";
import { detectInverseHeadAndShoulders } from "../src/patterns/inverseHeadAndShoulders";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticIHSShape, syntheticMShape } from "../src/dev/fixtures";

describe("detectInverseHeadAndShoulders", () => {
  it("detects inverse H&S on synthetic IHS data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 60 };
    const candles = syntheticIHSShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectInverseHeadAndShoulders(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "inverse_head_and_shoulders");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bullish");
  });

  it("does not detect inverse H&S on M-shape data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 60 };
    const candles = syntheticMShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectInverseHeadAndShoulders(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
