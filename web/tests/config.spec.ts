import { describe, expect, it } from "vitest";
import { defaultPatternConfig, resolveConfig } from "../src/patterns/config";

describe("resolveConfig", () => {
  it("overrides minSwingPct for 1d", () => {
    const cfg = resolveConfig("1d");
    expect(cfg.minSwingPct).toBe(0.020);
  });

  it("returns defaultPatternConfig values for 1h (empty override)", () => {
    const cfg = resolveConfig("1h");
    expect(cfg).toEqual(defaultPatternConfig);
  });

  it("returns defaultPatternConfig for unknown interval", () => {
    const cfg = resolveConfig("unknown");
    expect(cfg).toEqual(defaultPatternConfig);
  });

  it("preserves non-overridden fields (necklineTolPct) for 1d", () => {
    const cfg = resolveConfig("1d");
    expect(cfg.necklineTolPct).toBe(defaultPatternConfig.necklineTolPct);
  });

  it("applies all overrides for 1m", () => {
    const cfg = resolveConfig("1m");
    expect(cfg.minSwingPct).toBe(0.005);
    expect(cfg.pivotMinATR).toBe(1.5);
    expect(cfg.patternMinBars).toBe(8);
    expect(cfg.patternMaxBars).toBe(30);
    expect(cfg.cooldownBars).toBe(20);
    expect(cfg.minConfidence).toBe(0.7);
  });

  it("applies overrides for 1wk", () => {
    const cfg = resolveConfig("1wk");
    expect(cfg.minSwingPct).toBe(0.025);
    expect(cfg.pivotMinATR).toBe(0.5);
    expect(cfg.patternMinBars).toBe(6);
    expect(cfg.cooldownBars).toBe(3);
  });
});
