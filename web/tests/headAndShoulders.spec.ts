import { describe, expect, it } from "vitest";
import { detectHeadAndShoulders } from "../src/patterns/headAndShoulders";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticHSShape, syntheticWShape } from "../src/dev/fixtures";

describe("detectHeadAndShoulders", () => {
  it("detects H&S on synthetic HS data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 60 };
    const candles = syntheticHSShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectHeadAndShoulders(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "head_and_shoulders");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bearish");
  });

  it("does not detect H&S on W-shape data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 60 };
    const candles = syntheticWShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectHeadAndShoulders(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });
});
