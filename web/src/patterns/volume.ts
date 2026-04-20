import type { Candle } from "./types";

const VOLUME_LOOKBACK = 20;

export function volumeRatio(candles: Candle[], idx: number): number {
  if (idx < 1 || candles[idx].volume <= 0) return 0;

  const start = Math.max(0, idx - VOLUME_LOOKBACK);
  let sum = 0;
  let count = 0;
  for (let i = start; i < idx; i++) {
    if (candles[i].volume > 0) {
      sum += candles[i].volume;
      count++;
    }
  }
  if (count === 0) return 0;
  return candles[idx].volume / (sum / count);
}
