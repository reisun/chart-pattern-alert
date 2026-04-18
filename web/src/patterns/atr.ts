import type { Candle } from "./types";

/**
 * Calculate Average True Range (ATR) over the given period.
 * If candles.length < period, uses all available candles.
 * Returns 0 if fewer than 2 candles are provided.
 */
export function calcATR(candles: Candle[], period: number): number {
  if (candles.length < 2) return 0;

  const len = Math.min(period, candles.length - 1);
  const start = candles.length - len;
  let sum = 0;

  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
    sum += tr;
  }

  return sum / len;
}
