import { describe, expect, it } from "vitest";
import {
  getHigherTimeframe,
  getHigherTfRange,
  detectTrend,
  checkAlignment,
  adjustConfidence,
} from "../src/services/higherTimeframe";
import type { Candle } from "../src/patterns/types";

function makeCandles(closes: number[], baseTime = 1000): Candle[] {
  return closes.map((close, i) => ({
    time: baseTime + i * 86400,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}

describe("getHigherTimeframe", () => {
  it("maps each interval to its higher timeframe", () => {
    expect(getHigherTimeframe("1m")).toBe("15m");
    expect(getHigherTimeframe("5m")).toBe("1h");
    expect(getHigherTimeframe("15m")).toBe("4h");
    expect(getHigherTimeframe("30m")).toBe("4h");
    expect(getHigherTimeframe("1h")).toBe("1d");
    expect(getHigherTimeframe("4h")).toBe("1d");
    expect(getHigherTimeframe("1d")).toBe("1wk");
  });

  it("returns null for the highest timeframe", () => {
    expect(getHigherTimeframe("1wk")).toBeNull();
  });

  it("returns null for unknown intervals", () => {
    expect(getHigherTimeframe("3m")).toBeNull();
  });
});

describe("getHigherTfRange", () => {
  it("returns appropriate range for known intervals", () => {
    expect(getHigherTfRange("1d")).toBe("1y");
    expect(getHigherTfRange("1wk")).toBe("2y");
  });

  it("returns default for unknown intervals", () => {
    expect(getHigherTfRange("unknown")).toBe("1y");
  });
});

describe("detectTrend", () => {
  it("returns neutral when data is insufficient", () => {
    const candles = makeCandles(Array.from({ length: 20 }, (_, i) => 100 + i));
    expect(detectTrend(candles)).toBe("neutral");
  });

  it("detects bullish trend from rising closes", () => {
    // 30 candles with steadily rising prices
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const candles = makeCandles(closes);
    expect(detectTrend(candles)).toBe("bullish");
  });

  it("detects bearish trend from falling closes", () => {
    // 30 candles with steadily falling prices
    const closes = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
    const candles = makeCandles(closes);
    expect(detectTrend(candles)).toBe("bearish");
  });

  it("returns neutral for flat prices", () => {
    // 30 candles with flat prices
    const closes = Array.from({ length: 30 }, () => 100);
    const candles = makeCandles(closes);
    expect(detectTrend(candles)).toBe("neutral");
  });

  it("uses atrApprox threshold when provided", () => {
    // Small upward drift that would be bullish without ATR but neutral with large ATR
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 0.01);
    const candles = makeCandles(closes);
    // With large ATR, the small drift should be neutral
    expect(detectTrend(candles, 100)).toBe("neutral");
  });
});

describe("checkAlignment", () => {
  it("returns aligned when direction matches trend", () => {
    expect(checkAlignment("bullish", "bullish")).toBe("aligned");
    expect(checkAlignment("bearish", "bearish")).toBe("aligned");
  });

  it("returns opposed when direction opposes trend", () => {
    expect(checkAlignment("bullish", "bearish")).toBe("opposed");
    expect(checkAlignment("bearish", "bullish")).toBe("opposed");
  });

  it("returns neutral when trend is neutral", () => {
    expect(checkAlignment("bullish", "neutral")).toBe("neutral");
    expect(checkAlignment("bearish", "neutral")).toBe("neutral");
  });

  it("returns neutral when trend is null", () => {
    expect(checkAlignment("bullish", null)).toBe("neutral");
    expect(checkAlignment("bearish", null)).toBe("neutral");
  });
});

describe("adjustConfidence", () => {
  it("adds 0.1 for aligned", () => {
    expect(adjustConfidence(0.7, "aligned")).toBeCloseTo(0.8);
  });

  it("subtracts 0.1 for opposed", () => {
    expect(adjustConfidence(0.7, "opposed")).toBeCloseTo(0.6);
  });

  it("returns unchanged for neutral", () => {
    expect(adjustConfidence(0.7, "neutral")).toBeCloseTo(0.7);
  });

  it("returns unchanged for unavailable", () => {
    expect(adjustConfidence(0.7, "unavailable")).toBeCloseTo(0.7);
  });

  it("clamps to 1.0 max", () => {
    expect(adjustConfidence(0.95, "aligned")).toBe(1.0);
  });

  it("clamps to 0.0 min", () => {
    expect(adjustConfidence(0.05, "opposed")).toBe(0.0);
  });
});
