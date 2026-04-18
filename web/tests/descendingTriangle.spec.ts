import { describe, expect, it } from "vitest";
import { detectDescendingTriangle } from "../src/patterns/descendingTriangle";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticDescendingTriangle, syntheticAscendingTriangle } from "../src/dev/fixtures";

describe("detectDescendingTriangle", () => {
  it("detects descending triangle on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticDescendingTriangle();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDescendingTriangle(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "descending_triangle");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bearish");
  });

  it("does not detect descending triangle on ascending triangle data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 40 };
    const candles = syntheticAscendingTriangle();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDescendingTriangle(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
