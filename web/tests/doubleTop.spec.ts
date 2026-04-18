import { describe, expect, it } from "vitest";
import { detectDoubleTop } from "../src/patterns/doubleTop";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { calcATR } from "../src/patterns/atr";
import { syntheticMShape, syntheticWShape } from "../src/dev/fixtures";

describe("detectDoubleTop", () => {
  it("detects M-shape with confirmed breakdown", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 30, minConfidence: 0 };
    const candles = syntheticMShape();
    const atr = calcATR(candles, cfg.atrPeriod);
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDoubleTop(candles, pivots, cfg, atr);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "double_top");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bearish");
  });

  it("does not detect double top on W-shape data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 30, minConfidence: 0 };
    const candles = syntheticWShape();
    const atr = calcATR(candles, cfg.atrPeriod);
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDoubleTop(candles, pivots, cfg, atr);
    expect(results.length).toBe(0);
  });
});
