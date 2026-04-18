import { describe, expect, it } from "vitest";
import { detectAscendingFlag } from "../src/patterns/ascendingFlag";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticAscendingFlag, syntheticDescendingFlag } from "../src/dev/fixtures";

describe("detectAscendingFlag", () => {
  it("detects ascending flag on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticAscendingFlag();
    const results = detectAscendingFlag(candles, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "ascending_flag");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bullish");
  });

  it("does not detect ascending flag on descending flag data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticDescendingFlag();
    const results = detectAscendingFlag(candles, cfg);
    expect(results.length).toBe(0);
  });
});
