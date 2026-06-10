import { HSLColor } from './types';

export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function colorMatch(hsl1: HSLColor, hsl2: HSLColor, tolH: number = 20, tolSL: number = 0.3): boolean {
  let dH = Math.abs(hsl1.h - hsl2.h);
  if (dH > 180) dH = 360 - dH;
  const dS = Math.abs(hsl1.s - hsl2.s);
  const dL = Math.abs(hsl1.l - hsl2.l);
  
  return dH < tolH && dS < tolSL && dL < tolSL;
}

export function calculateLinearRegression(data: {x: number, y: number}[]) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    sumX += data[i].x;
    sumY += data[i].y;
    sumXY += data[i].x * data[i].y;
    sumXX += data[i].x * data[i].x;
    sumYY += data[i].y * data[i].y;
  }
  
  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0) return { slope: 0, intercept: 0, r2: 0 };
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * data[i].x + intercept;
    ssTot += Math.pow(data[i].y - meanY, 2);
    ssRes += Math.pow(data[i].y - predicted, 2);
  }
  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

export function calculateViscosity(params: {
  d: number, // mm
  rho_b: number, // kg/m^3
  rho_l: number, // kg/m^3
  D: number, // mm
  g: number, // m/s^2
  v: number // m/s (slope from time(s) vs displacement(m))
}) {
  // Convert mm to m
  const d_m = params.d / 1000;
  const D_m = params.D / 1000;
  
  // Stokes' law with wall correction
  // η = (ρ_b - ρ_l) * g * d^2 / (18 * v * (1 + 2.4 * d/D))
  const correction = 1 + 2.4 * (d_m / D_m);
  const numerator = (params.rho_b - params.rho_l) * params.g * Math.pow(d_m, 2);
  const denominator = 18 * params.v * correction;
  
  return numerator / denominator; // Pa*s
}
