import type { Candle, DetectedPattern, PatternConfig } from "./types";
import { linearRegression, lineAt } from "./regression";

export function detectAscendingFlag(
  candles: Candle[],
  cfg: PatternConfig,
): DetectedPattern[] {
  if (candles.length < cfg.flagMinBars + 5) return [];

  const out: DetectedPattern[] = [];

  for (let poleEnd = 5; poleEnd < candles.length - cfg.flagMinBars; poleEnd++) {
    let poleStart = poleEnd;
    for (let j = poleEnd - 1; j >= 0; j--) {
      if (candles[j].close < candles[j + 1].close) {
        poleStart = j;
      } else {
        break;
      }
    }

    const poleRise = (candles[poleEnd].close - candles[poleStart].close) / candles[poleStart].close;
    if (poleRise < cfg.flagPoleMinPct) continue;

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

      const upperAtBreak = lineAt(regH, flagEnd - poleEnd);
      const last = candles[candles.length - 1];
      const confirmed = last.close > upperAtBreak * (1 + cfg.necklineTolPct);

      out.push({
        id: makeId("ascending_flag", candles[breakIdx].time, upperAtBreak),
        kind: "ascending_flag",
        direction: "bullish",
        confidence: confirmed ? 0.7 : 0.5,
        startTime: candles[poleStart].time,
        endTime: candles[breakIdx].time,
        markerTime: candles[breakIdx].time,
        neckline: upperAtBreak,
        note: confirmed ? "flag breakout" : "tentative",
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
