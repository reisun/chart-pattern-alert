import type { Candle, DetectedPattern, PatternConfig } from "./types";
import { linearRegression, lineAt } from "./regression";

export function detectDescendingFlag(
  candles: Candle[],
  cfg: PatternConfig,
  atr?: number,
): DetectedPattern[] {
  if (candles.length < cfg.flagMinBars + 5) return [];

  const out: DetectedPattern[] = [];

  for (let poleEnd = 5; poleEnd < candles.length - cfg.flagMinBars; poleEnd++) {
    let poleStart = poleEnd;
    for (let j = poleEnd - 1; j >= 0; j--) {
      if (candles[j].close > candles[j + 1].close) {
        poleStart = j;
      } else {
        break;
      }
    }

    const poleDrop = (candles[poleStart].close - candles[poleEnd].close) / candles[poleStart].close;
    if (poleDrop < cfg.flagPoleMinPct) continue;

    // ATR-based pole length check
    if (atr != null && atr > 0) {
      const poleLen = candles[poleStart].close - candles[poleEnd].close;
      if (poleLen < atr * cfg.flagPoleMinATR) continue;
    }

    const maxFlagEnd = Math.min(poleEnd + cfg.flagMaxBars, candles.length - 1);
    for (let flagEnd = poleEnd + cfg.flagMinBars; flagEnd <= maxFlagEnd; flagEnd++) {
      const flagCandles = candles.slice(poleEnd, flagEnd + 1);
      const xs = flagCandles.map((_, i) => i);
      const highs = flagCandles.map((c) => c.high);
      const lows = flagCandles.map((c) => c.low);

      const regH = linearRegression(xs, highs);
      const regL = linearRegression(xs, lows);

      const slopeH = Math.atan(regH.slope / candles[poleEnd].close);
      const slopeL = Math.atan(regL.slope / candles[poleEnd].close);

      if (Math.abs(slopeH) > cfg.flagSlopeMax || Math.abs(slopeL) > cfg.flagSlopeMax) continue;
      if (Math.abs(slopeH - slopeL) > cfg.flagParallelTol) continue;

      const breakIdx = flagEnd;
      if (breakIdx >= candles.length) continue;

      const lowerAtBreak = lineAt(regL, flagEnd - poleEnd);
      const last = candles[candles.length - 1];
      const confirmed = last.close < lowerAtBreak * (1 - cfg.necklineTolPct);

      out.push({
        id: makeId("descending_flag", candles[breakIdx].time, lowerAtBreak),
        kind: "descending_flag",
        direction: "bearish",
        confidence: confirmed ? 0.7 : 0.5,
        startTime: candles[poleStart].time,
        endTime: candles[breakIdx].time,
        markerTime: candles[breakIdx].time,
        neckline: lowerAtBreak,
        note: confirmed ? "flag breakdown" : "tentative",
      });

      break;
    }
  }

  return out;
}

function makeId(kind: string, markerTime: number, neckline: number): string {
  const n = Math.round(neckline * 1000);
  return `${kind}:${markerTime}:${n}`;
}
