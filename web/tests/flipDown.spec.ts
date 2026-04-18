import { describe, expect, it } from "vitest";
import { detectFlipDown } from "../src/patterns/flipDown";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticFlipDown, syntheticFlipUp } from "../src/dev/fixtures";

describe("detectFlipDown", () => {
  it("detects flip down on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.02, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticFlipDown();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectFlipDown(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "flip_down");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bearish");
  });

  it("does not detect flip down on flip up data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.02, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticFlipUp();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectFlipDown(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
