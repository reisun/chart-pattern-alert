import { describe, expect, it } from "vitest";
import { findPivots } from "../src/patterns/pivots";
import type { Candle } from "../src/patterns/types";

function candle(time: number, price: number, spread = 0.1): Candle {
  return {
    time,
    open: price,
    high: price + spread,
    low: price - spread,
    close: price,
    volume: 1000,
  };
}

describe("findPivots", () => {
  it("returns empty for empty input", () => {
    expect(findPivots([], 0.01)).toEqual([]);
  });

  it("detects alternating pivots on synthetic zigzag", () => {
    // prices: up, down, up, down — should emit high, low, high in order
    const prices = [100, 101, 102, 103, 104, 105, 104, 103, 102, 101, 102, 103, 105, 106, 105, 104, 103];
    const candles = prices.map((p, i) => candle(i, p, 0.05));
    const pivots = findPivots(candles, 0.01); // 1% swing
    expect(pivots.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < pivots.length; i++) {
      expect(pivots[i].kind).not.toBe(pivots[i - 1].kind);
    }
  });

  it("produces no pivots if swings are below threshold", () => {
    const prices = [100, 100.1, 99.95, 100.05, 100.02];
    const candles = prices.map((p, i) => candle(i, p, 0.01));
    const pivots = findPivots(candles, 0.05);
    expect(pivots.length).toBe(0);
  });

  it("filters pivots by ATR and bar distance when provided", () => {
    const prices = [100, 101, 102, 103, 104, 105, 104, 103, 102, 101, 102, 103, 105, 106, 105, 104, 103];
    const candles = prices.map((p, i) => candle(i, p, 0.05));
    // Without ATR filter
    const raw = findPivots(candles, 0.01);
    // With very strict ATR filter — should produce fewer pivots
    const filtered = findPivots(candles, 0.01, 5, 1.0, 3);
    expect(filtered.length).toBeLessThanOrEqual(raw.length);
  });
});
