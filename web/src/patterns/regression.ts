export interface LinReg {
  slope: number;
  intercept: number;
}

export function linearRegression(xs: number[], ys: number[]): LinReg {
  const n = xs.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function lineAt(reg: LinReg, x: number): number {
  return reg.slope * x + reg.intercept;
}
