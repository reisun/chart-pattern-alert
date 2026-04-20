import type { Candle } from "../patterns/types";
import { fetchOhlcv } from "../api/client";
import { getHigherTfRange } from "./higherTimeframe";
import { intervalToSeconds } from "./patternTracker";

interface CacheEntry {
  candles: Candle[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function fetchHigherTfCandles(
  symbol: string,
  higherInterval: string,
): Promise<Candle[] | null> {
  const key = `${symbol}:${higherInterval}`;
  const now = Date.now();
  const ttl = intervalToSeconds(higherInterval) * 1000; // ms

  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < ttl) {
    return cached.candles;
  }

  try {
    const range = getHigherTfRange(higherInterval);
    const res = await fetchOhlcv(symbol, higherInterval, range);
    cache.set(key, { candles: res.candles, fetchedAt: now });
    return res.candles;
  } catch {
    // 上位足取得失敗は silent に
    return null;
  }
}
