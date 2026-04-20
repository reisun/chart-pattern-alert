import type { Candle, DetectedPattern, PatternConfig } from "./types";
import { computeConfidence } from "./scoring";
import { linearRegression, lineAt } from "./regression";

export function detectAscendingFlag(
  candles: Candle[],
  cfg: PatternConfig,
  atr?: number,
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

    if (atr != null && atr > 0) {
      const poleLen = candles[poleEnd].close - candles[poleStart].close;
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

      const upperAtBreak = lineAt(regH, flagEnd - poleEnd);
      const last = candles[candles.length - 1];
      const confirmed = last.close > upperAtBreak * (1 + cfg.necklineTolPct);
      const safeAtr = atr != null && atr > 0 ? atr : 1;
      const poleLen = candles[poleEnd].close - candles[poleStart].close;
      const flagBars = flagEnd - poleEnd;

      const confidence = computeConfidence({
        isConfirmed: confirmed,
        atrDepthRatio: poleLen / safeAtr,
        patternBars: flagBars,
        breakStrength: confirmed ? Math.abs(last.close - upperAtBreak) / safeAtr : 0,
        symmetry: cfg.flagSlopeMax > 0 ? Math.max(0, 1 - Math.abs(slopeH - slopeL) / cfg.flagSlopeMax) : 0,
        patternMinBars: cfg.flagMinBars,
        patternMaxBars: cfg.flagMaxBars,
      });

      out.push({
        id: makeId("ascending_flag", candles[breakIdx].time, upperAtBreak),
        kind: "ascending_flag",
        direction: "bullish",
        confidence,
        status: confirmed ? "confirmed" : "candidate",
        startTime: candles[poleStart].time,
        endTime: candles[breakIdx].time,
        markerTime: candles[breakIdx].time,
        neckline: upperAtBreak,
        note: confirmed ? "flag breakout" : "tentative",
        detectedAt: last.time,
        confirmedAt: confirmed ? last.time : undefined,
        entryPrice: confirmed ? last.close : undefined,
        atrAtDetection: atr ?? 0,
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
