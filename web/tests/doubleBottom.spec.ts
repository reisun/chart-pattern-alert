import { describe, expect, it } from "vitest";
import { detectDoubleBottom } from "../src/patterns/doubleBottom";
import { findPivots } from "../src/patterns/pivots";
import { defaultPatternConfig } from "../src/patterns/config";
import { syntheticWShape, syntheticMShape } from "../src/dev/fixtures";

describe("detectDoubleBottom", () => {
  it("detects W-shape with confirmed breakout", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticWShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDoubleBottom(candles, pivots, cfg);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "double_bottom");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bullish");
    expect(hit!.neckline).toBeGreaterThan(0);
  });

  it("does not detect double bottom on M-shape data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticMShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const results = detectDoubleBottom(candles, pivots, cfg);
    expect(results.length).toBe(0);
  });

  it("returns stable id for identical inputs", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.01, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticWShape();
    const pivots = findPivots(candles, cfg.minSwingPct);
    const a = detectDoubleBottom(candles, pivots, cfg);
    const b = detectDoubleBottom(candles, pivots, cfg);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });
});
