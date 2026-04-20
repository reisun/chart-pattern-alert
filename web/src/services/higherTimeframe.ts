import type { Candle } from "../patterns/types";

// 上位足マッピング
const HIGHER_TF_MAP: Record<string, string | null> = {
  "1m": "15m",
  "5m": "1h",
  "15m": "4h",
  "30m": "4h",
  "1h": "1d",
  "4h": "1d",
  "1d": "1wk",
  "1wk": null, // 最上位足に上位足はない
};

export function getHigherTimeframe(interval: string): string | null {
  return HIGHER_TF_MAP[interval] ?? null;
}

// 上位足のrange（データ範囲）。EMA(20)に必要な本数を確保
const HIGHER_TF_RANGE: Record<string, string> = {
  "15m": "5d",
  "1h": "1mo",
  "4h": "3mo",
  "1d": "1y",
  "1wk": "2y",
};

export function getHigherTfRange(higherInterval: string): string {
  return HIGHER_TF_RANGE[higherInterval] ?? "1y";
}

export type TrendDirection = "bullish" | "bearish" | "neutral";

// EMA(period) を計算して全値を返す
function ema(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    result.push(closes[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

// 上位足キャンドルからトレンド方向を判定
// EMA(20)の直近2本の傾きで判定。ATR の 0.1倍未満の変化は neutral。
export function detectTrend(candles: Candle[], atrApprox?: number): TrendDirection {
  if (candles.length < 22) return "neutral";

  const closes = candles.map((c) => c.close);
  const emaValues = ema(closes, 20);

  const current = emaValues[emaValues.length - 1];
  const prev = emaValues[emaValues.length - 3]; // 2本前と比較（変動を見やすく）

  const diff = current - prev;

  // ATR近似がなければ price の 0.1% を閾値に
  const threshold =
    atrApprox != null && atrApprox > 0 ? atrApprox * 0.1 : current * 0.001;

  if (diff > threshold) return "bullish";
  if (diff < -threshold) return "bearish";
  return "neutral";
}

// パターンの direction と上位足トレンドの整合を判定
export type Alignment = "aligned" | "opposed" | "neutral" | "unavailable";

export function checkAlignment(
  patternDirection: "bullish" | "bearish",
  trend: TrendDirection | null,
): Alignment {
  if (trend == null || trend === "neutral") return "neutral";
  return patternDirection === trend ? "aligned" : "opposed";
}

// confidence 調整
export function adjustConfidence(
  confidence: number,
  alignment: Alignment,
): number {
  if (alignment === "aligned") return Math.min(1.0, confidence + 0.1);
  if (alignment === "opposed") return Math.max(0.0, confidence - 0.1);
  return confidence;
}
