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
