import { describe, expect, it } from "vitest";
import { detectFlipUp } from "../src/patterns/flipUp";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticFlipUp, syntheticFlipDown } from "../src/dev/fixtures";

describe("detectFlipUp", () => {
  it("detects flip up on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.02, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticFlipUp();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectFlipUp(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "flip_up");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bullish");
  });

  it("does not detect flip up on flip down data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.02, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticFlipDown();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectFlipUp(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
