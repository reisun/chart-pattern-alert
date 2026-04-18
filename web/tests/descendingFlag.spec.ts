import { describe, expect, it } from "vitest";
import { detectDescendingFlag } from "../src/patterns/descendingFlag";
import { defaultPatternConfig } from "../src/patterns/config";
import { calcATR } from "../src/patterns/atr";
import { syntheticDescendingFlag, syntheticAscendingFlag } from "../src/dev/fixtures";

describe("detectDescendingFlag", () => {
  it("detects descending flag on synthetic data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticDescendingFlag();
    const atr = calcATR(candles, cfg.atrPeriod);
    const results = detectDescendingFlag(candles, cfg, atr);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hit = results.find((p) => p.kind === "descending_flag");
    expect(hit).toBeDefined();
    expect(hit!.direction).toBe("bearish");
  });

  it("does not detect descending flag on ascending flag data", () => {
    const cfg = { ...defaultPatternConfig, minSwingPct: 0.005, patternMinBars: 5, patternMaxBars: 30 };
    const candles = syntheticAscendingFlag();
    const atr = calcATR(candles, cfg.atrPeriod);
    const results = detectDescendingFlag(candles, cfg, atr);
    expect(results.length).toBe(0);
  });
});
