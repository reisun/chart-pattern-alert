import { describe, expect, it } from "vitest";
import { computeTargets, computeEvalWindow, updateTracking, intervalToSeconds } from "../src/services/patternTracker";
import type { PatternLogEntry } from "../src/services/patternLog";
import type { Candle } from "../src/patterns/types";

function makeEntry(overrides: Partial<PatternLogEntry> = {}): PatternLogEntry {
  return {
    id: "test:1",
    symbol: "7974",
    timeframe: "1d",
    kind: "double_bottom",
    direction: "bullish",
    status: "confirmed",
    confidence: 0.8,
    detectedAt: 1000,
    atrAtDetection: 100,
    loggedAt: Date.now(),
    outcome: "tracking",
    mfe: 0,
    mae: 0,
    evalWindowBars: 30,
    evalStartPrice: 1000,
    successTarget: 1200,
    failTarget: 900,
    barsElapsed: 0,
    ...overrides,
  };
}

function makeCandle(close: number, time = 0): Candle {
  return { time, open: close, high: close, low: close, close, volume: 100 };
}

describe("computeTargets", () => {
  it("bullish: success = price + 2*ATR, fail = price - 1*ATR", () => {
    const entry = makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 100 });
    const { successTarget, failTarget } = computeTargets(entry);
    expect(successTarget).toBe(1200);
    expect(failTarget).toBe(900);
  });

  it("bearish: success = price - 2*ATR, fail = price + 1*ATR", () => {
    const entry = makeEntry({ direction: "bearish", evalStartPrice: 1000, atrAtDetection: 100 });
    const { successTarget, failTarget } = computeTargets(entry);
    expect(successTarget).toBe(800);
    expect(failTarget).toBe(1100);
  });

  it("is direction-symmetric (same magnitude, opposite signs)", () => {
    const bull = computeTargets(makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 50 }));
    const bear = computeTargets(makeEntry({ direction: "bearish", evalStartPrice: 1000, atrAtDetection: 50 }));
    // Bull success offset = +100, bear success offset = -100
    expect(bull.successTarget - 1000).toBe(-(bear.successTarget - 1000));
    // Bull fail offset = -50, bear fail offset = +50
    expect(bull.failTarget - 1000).toBe(-(bear.failTarget - 1000));
  });
});

describe("computeEvalWindow", () => {
  it("returns minimum 20 for small patterns", () => {
    expect(computeEvalWindow(5)).toBe(20);
    expect(computeEvalWindow(10)).toBe(20);
  });

  it("returns maximum 100 for large patterns", () => {
    expect(computeEvalWindow(80)).toBe(100);
    expect(computeEvalWindow(200)).toBe(100);
  });

  it("returns 1.5x for normal patterns", () => {
    expect(computeEvalWindow(30)).toBe(45);
    expect(computeEvalWindow(40)).toBe(60);
  });
});

describe("intervalToSeconds", () => {
  it("maps known intervals", () => {
    expect(intervalToSeconds("1m")).toBe(60);
    expect(intervalToSeconds("5m")).toBe(300);
    expect(intervalToSeconds("1h")).toBe(3600);
    expect(intervalToSeconds("1d")).toBe(86400);
  });

  it("defaults to 86400 for unknown intervals", () => {
    expect(intervalToSeconds("unknown")).toBe(86400);
  });
});

describe("updateTracking", () => {
  it("bullish success when price reaches +2 ATR", () => {
    const entry = makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 1200, failTarget: 900 });
    const result = updateTracking(entry, makeCandle(1200, 5000));
    expect(result.outcome).toBe("success");
    expect(result.outcomeAt).toBe(5000);
    expect(result.barsElapsed).toBe(1);
  });

  it("bullish failure when price drops to -1 ATR", () => {
    const entry = makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 1200, failTarget: 900 });
    const result = updateTracking(entry, makeCandle(900, 5000));
    expect(result.outcome).toBe("fail");
    expect(result.outcomeAt).toBe(5000);
  });

  it("bearish success when price drops to -2 ATR", () => {
    const entry = makeEntry({ direction: "bearish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 800, failTarget: 1100 });
    const result = updateTracking(entry, makeCandle(800, 5000));
    expect(result.outcome).toBe("success");
    expect(result.outcomeAt).toBe(5000);
  });

  it("bearish failure when price rises to +1 ATR", () => {
    const entry = makeEntry({ direction: "bearish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 800, failTarget: 1100 });
    const result = updateTracking(entry, makeCandle(1100, 5000));
    expect(result.outcome).toBe("fail");
    expect(result.outcomeAt).toBe(5000);
  });

  it("expires when barsElapsed reaches evalWindowBars", () => {
    const entry = makeEntry({ evalWindowBars: 5, barsElapsed: 4 });
    const result = updateTracking(entry, makeCandle(1050, 5000));
    expect(result.outcome).toBe("expired");
    expect(result.outcomeAt).toBe(5000);
    expect(result.barsElapsed).toBe(5);
  });

  it("updates MFE and MAE correctly for bullish", () => {
    const entry = makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 1200, failTarget: 900, mfe: 0, mae: 0 });
    // Price goes up: favorable for bullish
    const up = updateTracking(entry, makeCandle(1150));
    expect(up.mfe).toBeCloseTo(1.5); // (1150-1000)/100
    expect(up.mae).toBe(0); // adverse is negative, max(0, negative) = 0

    // Price goes down: adverse for bullish
    const down = updateTracking(entry, makeCandle(950));
    expect(down.mfe).toBe(0); // favorable is negative
    expect(down.mae).toBeCloseTo(0.5); // (1000-950)/100
  });

  it("updates MFE and MAE correctly for bearish", () => {
    const entry = makeEntry({ direction: "bearish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 800, failTarget: 1100, mfe: 0, mae: 0 });
    // Price goes down: favorable for bearish
    const down = updateTracking(entry, makeCandle(850));
    expect(down.mfe).toBeCloseTo(1.5); // favorable = -(850-1000)/100 = 1.5
    expect(down.mae).toBe(0);

    // Price goes up: adverse for bearish
    const up = updateTracking(entry, makeCandle(1050));
    expect(up.mfe).toBe(0);
    expect(up.mae).toBeCloseTo(0.5);
  });

  it("returns expired when ATR is 0", () => {
    const entry = makeEntry({ atrAtDetection: 0 });
    const result = updateTracking(entry, makeCandle(1050));
    expect(result.outcome).toBe("expired");
  });

  it("does not change entries that are not tracking", () => {
    const entry = makeEntry({ outcome: "success" });
    const result = updateTracking(entry, makeCandle(500));
    expect(result).toBe(entry); // same reference, no change
  });

  it("continues tracking when price is between targets", () => {
    const entry = makeEntry({ direction: "bullish", evalStartPrice: 1000, atrAtDetection: 100, successTarget: 1200, failTarget: 900, evalWindowBars: 30 });
    const result = updateTracking(entry, makeCandle(1050));
    expect(result.outcome).toBe("tracking");
    expect(result.barsElapsed).toBe(1);
  });
});
