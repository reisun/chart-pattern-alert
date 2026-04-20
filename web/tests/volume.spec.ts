import { describe, expect, it } from "vitest";
import { volumeRatio } from "../src/patterns/volume";
import type { Candle } from "../src/patterns/types";

function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    time: 0,
    open: 100,
    high: 105,
    low: 95,
    close: 100,
    volume: 100,
    ...overrides,
  };
}

function makeCandles(count: number, volume: number): Candle[] {
  return Array.from({ length: count }, (_, i) =>
    makeCandle({ time: i, volume }),
  );
}

describe("volumeRatio", () => {
  it("returns ratio when breakout volume exceeds average", () => {
    const candles = [
      ...makeCandles(20, 100),
      makeCandle({ time: 20, volume: 200 }),
    ];
    expect(volumeRatio(candles, 20)).toBeCloseTo(2.0);
  });

  it("returns 0 when current candle volume is 0", () => {
    const candles = [
      ...makeCandles(20, 100),
      makeCandle({ time: 20, volume: 0 }),
    ];
    expect(volumeRatio(candles, 20)).toBe(0);
  });

  it("returns 0 when idx is 0", () => {
    const candles = [makeCandle({ volume: 200 })];
    expect(volumeRatio(candles, 0)).toBe(0);
  });

  it("handles lookback shorter than 20", () => {
    const candles = [
      ...makeCandles(5, 100),
      makeCandle({ time: 5, volume: 150 }),
    ];
    expect(volumeRatio(candles, 5)).toBeCloseTo(1.5);
  });

  it("skips zero-volume candles in average calculation", () => {
    const candles = [
      makeCandle({ time: 0, volume: 100 }),
      makeCandle({ time: 1, volume: 0 }),
      makeCandle({ time: 2, volume: 100 }),
      makeCandle({ time: 3, volume: 200 }),
    ];
    // avg of [100, 100] = 100, ratio = 200/100 = 2.0
    expect(volumeRatio(candles, 3)).toBeCloseTo(2.0);
  });

  it("returns 0 when all prior candles have zero volume", () => {
    const candles = [
      ...makeCandles(5, 0),
      makeCandle({ time: 5, volume: 200 }),
    ];
    expect(volumeRatio(candles, 5)).toBe(0);
  });
});
