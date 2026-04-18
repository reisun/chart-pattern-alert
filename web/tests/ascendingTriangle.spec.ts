import { describe, expect, it } from "vitest";
import { detectAscendingTriangle } from "../src/patterns/ascendingTriangle";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticAscendingTriangle, syntheticDescendingTriangle } from "../src/dev/fixtures";

describe("detectAscendingTriangle", () => {
  it("detects ascending triangle on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticAscendingTriangle();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectAscendingTriangle(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "ascending_triangle");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bullish");
  });

  it("does not detect ascending triangle on descending triangle data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticDescendingTriangle();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectAscendingTriangle(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
