/**
 * MEASURE — synthetic control with in-space placebo test.
 *
 * Method: donor weights w ≥ 0, Σw = 1, fitted by non-negative least squares on the 104 pre-weeks (column-scaled,
 * sum constraint as a heavily weighted row). Counterfactual = weighted donors over the 52 post-weeks.
 * Uncertainty: the same estimator applied to each donor as if it had been treated (placebos); their spread is the
 * standard error. The property's effect is ranked among the placebos.
 * INCONCLUSIVE is a valid, expected outcome; the engine never forces a positive.
 */
import type { MeasurementPlan, MeasurementResult, Intervention } from "./model.js";
import { verifyPlan } from "./register.js";
import { WEEKS_PRE, type Series } from "./property.js";
import type { Rng } from "./rng.js";

/** Coordinate-descent NNLS: min ||Ax − b||², x ≥ 0. A is rows × cols. */
export function nnls(A: readonly (readonly number[])[], b: readonly number[], iters = 2_000): number[] {
  const rows = A.length, cols = A[0]?.length ?? 0;
  const x = new Array<number>(cols).fill(0);
  const resid = b.map((v) => -v); // Ax − b with x = 0
  const colNorm = Array.from({ length: cols }, (_, j) => A.reduce((s, row) => s + (row[j] ?? 0) ** 2, 0));
  for (let it = 0; it < iters; it++) {
    let maxDelta = 0;
    for (let j = 0; j < cols; j++) {
      const nj = colNorm[j] ?? 0; if (nj === 0) continue;
      let g = 0; for (let r = 0; r < rows; r++) g += (A[r]?.[j] ?? 0) * (resid[r] ?? 0);
      const nx = Math.max(0, (x[j] ?? 0) - g / nj), delta = nx - (x[j] ?? 0);
      if (delta !== 0) { x[j] = nx; for (let r = 0; r < rows; r++) resid[r] = (resid[r] ?? 0) + delta * (A[r]?.[j] ?? 0); maxDelta = Math.max(maxDelta, Math.abs(delta)); }
    }
    if (maxDelta < 1e-10) break;
  }
  return x;
}

export interface SynthFit { readonly observedPost: number; readonly counterfactualPost: number; readonly weights: number[]; readonly preRmspe: number }

/** Fit unit `unit` against all other units in Y (units × weeks). */
export function synthFit(Y: readonly (readonly number[])[], unit: number, pre = WEEKS_PRE): SynthFit {
  const donors = Y.map((_, i) => i).filter((i) => i !== unit);
  const y = Y[unit] ?? [];
  const sy = y.slice(0, pre).reduce((a, b) => a + b, 0) / pre;
  const sx = donors.map((d) => (Y[d] ?? []).slice(0, pre).reduce((a, b) => a + b, 0) / pre);
  const A: number[][] = []; const b: number[] = [];
  for (let t = 0; t < pre; t++) { A.push(donors.map((d, k) => (Y[d]?.[t] ?? 0) / (sx[k] ?? 1))); b.push((y[t] ?? 0) / sy); }
  A.push(donors.map(() => 50)); b.push(50);
  let w = nnls(A, b); const sw = w.reduce((a, c) => a + c, 0) || 1; w = w.map((v) => v / sw);
  const synth = (t: number) => sy * donors.reduce((s, d, k) => s + (w[k] ?? 0) * ((Y[d]?.[t] ?? 0) / (sx[k] ?? 1)), 0);
  let sse = 0; for (let t = 0; t < pre; t++) sse += ((y[t] ?? 0) - synth(t)) ** 2;
  let obs = 0, cf = 0; for (let t = pre; t < y.length; t++) { obs += y[t] ?? 0; cf += synth(t); }
  return { observedPost: obs, counterfactualPost: cf, weights: w, preRmspe: Math.sqrt(sse / pre) / sy };
}

const erf = (x: number): number => { const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a); return s * y; };

/**
 * Simulation truth, hidden from the estimator: each funded intervention works with its declared confidence;
 * if it works its annual effect is drawn inside its range. Returns the post-period series with the effect applied.
 */
export function applyOutcome(series: Series, funded: readonly Intervention[], annualRevenue: number, r: Rng): { property: number[]; trueGainGbp: number } {
  let gain = 0;
  for (const i of funded) if (r.next() < i.confidence) gain += r.uniform(i.effectIfWorksGbp.low, i.effectIfWorksGbp.high);
  const f = 1 + gain / annualRevenue;
  return { property: series.property.map((v, t) => (t >= WEEKS_PRE ? v * f : v)), trueGainGbp: gain };
}

export function measure(plan: MeasurementPlan, property: readonly number[], comparables: readonly (readonly number[])[], measuredAt: string): MeasurementResult {
  const Y = [property, ...comparables];
  const fit = synthFit(Y, 0);
  const eff = fit.observedPost / fit.counterfactualPost - 1;
  const placebos = comparables.map((_, j) => { const f = synthFit(Y, j + 1); return f.observedPost / f.counterfactualPost - 1; });
  const mean = placebos.reduce((a, b) => a + b, 0) / placebos.length;
  const se = Math.sqrt(placebos.reduce((a, b) => a + (b - mean) ** 2, 0) / placebos.length);
  const rank = 1 + placebos.filter((p) => Math.abs(p) >= Math.abs(eff)).length; // 1 = most extreme of all units
  const of = placebos.length + 1;
  const low = (eff - 1.645 * se) * fit.counterfactualPost, high = (eff + 1.645 * se) * fit.counterfactualPost;
  const pPositive = 1 - 0.5 * (1 + erf(-eff / (se * Math.SQRT2)));
  const excludesZero = low > 0 || high < 0;
  const placeboPassed = rank === 1;
  const status: MeasurementResult["status"] = excludesZero && placeboPassed ? "ESTABLISHED" : excludesZero || (placeboPassed && pPositive > 0.9) ? "PROVISIONAL" : "INCONCLUSIVE";
  const point = fit.observedPost - fit.counterfactualPost;
  const inRange = point >= plan.expectedGbp.low && point <= plan.expectedGbp.high;
  const planStatus: MeasurementResult["planStatus"] = low > 0 && inRange ? "VALIDATED" : low > 0 ? "PARTIALLY_VALIDATED" : "NOT_VALIDATED";
  return {
    planId: `${plan.id}@v${plan.version}`, planIntact: verifyPlan(plan),
    method: "synthetic control, in-space placebo inference",
    methodWhy: "one treated unit, no randomisation possible, 104 pre-weeks and 10 untreated comparables available: a weighted combination of comparables reproduces the pre-period better than any single comparable or a before/after comparison, and placebo fits give an honest error without distributional assumptions",
    observedGbp: fit.observedPost, counterfactualGbp: fit.counterfactualPost,
    incrementalGbp: { low, high }, incrementalPointGbp: point, effectPct: eff, sePct: se, pPositive,
    placebo: { passed: placeboPassed, rank, of, note: placeboPassed ? `the property's effect is the most extreme of ${of} units` : `${rank - 1} untreated comparable(s) show an effect at least as large: the estimate is within placebo noise` },
    preFitRmspe: fit.preRmspe, status, planStatus, measuredAt,
  };
}
