import type { Candle } from "../patterns/types";

/**
 * Build a synthetic W-shape candle series with a clear double-bottom.
 * Used when the real API is rate-limited in dev or when bootstrapping the UI
 * without running docker.
 */
export function syntheticWShape(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60; // 1h bars

  const path: number[] = [
    // descent
    100, 99, 98, 96, 94, 92,
    // bottom 1
    90, 91, 92,
    // ride up to middle peak
    93, 95, 96, 97,
    // down to bottom 2
    96, 95, 93, 91,
    // bottom 2
    90.5, 91,
    // rise and break neckline (97)
    93, 95, 97, 98, 99, 100,
  ].map((x) => (x - 100 + base));

  return synthesize(path, startTime, stepSec);
}

/**
 * Build a synthetic M-shape with a clear double-top.
 */
export function syntheticMShape(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // ascent
    100, 101, 102, 104, 106, 108,
    // top 1
    110, 109, 108,
    // retrace
    107, 105, 104, 103,
    // up to top 2
    104, 105, 107, 109,
    // top 2
    109.5, 109,
    // break neckline (103) down
    107, 105, 103, 102, 101, 100,
  ].map((x) => (x - 100 + base));

  return synthesize(path, startTime, stepSec);
}

export function syntheticIHSShape(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 5;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // initial decline
    100, 99, 98, 97, 96, 95,
    // left shoulder (low ~92) – extended for bar span
    94, 93, 92, 92.5, 93, 93.5, 94, 94.5, 95,
    // neckline area (~97) – extra bars for span
    96, 96.5, 97, 97.5, 97,
    // head (low ~88) – extended with more bars
    96, 94, 92, 90, 89, 88, 88.2, 88.5, 89, 90, 92, 94, 96,
    // neckline area (~97) – extra bars for span
    97, 97.5, 97,
    // right shoulder (low ~92) – extended with more bars
    96, 95, 94, 93, 92, 92.1, 92.2, 92.5, 93, 93.5, 94, 95, 96,
    // neckline area and breakout (~97)
    97, 97.5, 98, 99, 100,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticHSShape(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 5;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // initial rise
    100, 101, 102, 103, 104, 105,
    // left shoulder (high ~108) – extended
    106, 107, 108, 107.5, 107, 106.5, 106, 105.5, 105,
    // neckline area (~103) – extra bars for span
    104, 103.5, 103, 102.5, 103,
    // head (high ~112) – extended with more bars
    104, 106, 108, 110, 111, 112, 111.8, 111.5, 111, 110, 108, 106, 104,
    // neckline area (~103) – extra bars for span
    103, 102.5, 103,
    // right shoulder (high ~108) – extended with more bars
    104, 105, 106, 107, 108, 107.9, 107.8, 107.5, 107, 106.5, 106, 105, 104,
    // neckline breakdown (~103)
    103, 102.5, 102, 101, 100,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticAscendingFlag(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // pole: strong uptrend
    100, 101, 102, 103, 104, 105, 106, 107,
    // flag: slight downward channel
    106.5, 106, 105.8, 105.5, 105.3, 105, 104.8, 104.5,
    // breakout
    105, 106, 107, 108, 109,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticDescendingFlag(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // pole: strong downtrend
    100, 99, 98, 97, 96, 95, 94, 93,
    // flag: slight upward channel
    93.5, 94, 94.2, 94.5, 94.7, 95, 95.2, 95.5,
    // breakdown
    95, 94, 93, 92, 91,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticAscendingTriangle(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // resistance ~110, rising lows
    100, 102, 104, 106, 108, 110,  // touch 1
    108, 106, 104,                  // low 1 (~104)
    106, 108, 110,                  // touch 2
    109, 107, 105.5,                // low 2 (~105.5)
    107, 109, 110,                  // touch 3
    109, 108, 107,                  // low 3 (~107)
    108, 109, 110,                  // touch 4
    // breakout
    111, 112, 113,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticDescendingTriangle(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // support ~90, falling highs
    100, 98, 96, 94, 92, 90,    // touch 1
    92, 94, 96,                  // high 1 (~96)
    94, 92, 90,                  // touch 2
    91, 93, 94.5,                // high 2 (~94.5)
    93, 91, 90,                  // touch 3
    91, 92, 93,                  // high 3 (~93)
    92, 91, 90,                  // touch 4
    // breakdown
    89, 88, 87,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticFlipUp(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // descending resistance line: touches at ~100, ~97, ~94
    // touch 1 (~100)
    97, 98, 99, 100, 98, 96, 94,
    // touch 2 (~97)
    95, 96, 97, 95, 93, 91,
    // touch 3 (~94)
    92, 93, 94, 92, 91,
    // breakout above the descending line (~93 at this point)
    93, 94, 95, 96,
    // retest: dip back near line, hold above
    94, 93.5, 94, 95,
    // continuation up
    96, 97, 98,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

export function syntheticFlipDown(opts?: { startTime?: number; base?: number }): Candle[] {
  const startTime = opts?.startTime ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3;
  const base = opts?.base ?? 100;
  const stepSec = 60 * 60;

  const path: number[] = [
    // ascending support line: touches at ~100, ~103, ~106
    // touch 1 (~100)
    103, 102, 101, 100, 102, 104, 106,
    // touch 2 (~103)
    105, 104, 103, 105, 107, 109,
    // touch 3 (~106)
    108, 107, 106, 108, 109,
    // breakdown below the ascending line (~107 at this point)
    107, 106, 105, 104,
    // retest: bounce back near line, fail
    106, 106.5, 106, 105,
    // continuation down
    104, 103, 102,
  ].map((x) => x - 100 + base);

  return synthesize(path, startTime, stepSec);
}

function synthesize(path: number[], startTime: number, stepSec: number): Candle[] {
  const out: Candle[] = [];
  let t = startTime;
  for (let i = 0; i < path.length; i++) {
    const close = path[i];
    const open = i === 0 ? close : path[i - 1];
    const high = Math.max(open, close) + 0.15;
    const low = Math.min(open, close) - 0.15;
    out.push({
      time: t,
      open,
      high,
      low,
      close,
      volume: 1000 + Math.round(Math.random() * 500),
    });
    t += stepSec;
  }
  return out;
}
