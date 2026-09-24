/**
 * PRE-REGISTRATION — the measurement plan is written, hashed and frozen before any outcome is seen.
 * A change produces a new version that names what it supersedes; the old version is never edited.
 */
import { createHash } from "node:crypto";
import type { Intervention, MeasurementPlan } from "./model.js";
import { rng } from "./rng.js";
import { WEEKS_POST, WEEKS_PRE, N_COMPARABLES } from "./property.js";

export type PlanBody = Omit<MeasurementPlan, "sha256">;

export function hashPlan(body: PlanBody): string {
  const keys = Object.keys(body).sort();
  const canonical = JSON.stringify(body, keys);
  return createHash("sha256").update(canonical).digest("hex");
}

/** What our own assumptions imply: confidence-weighted P10 / mean / P90 of the annual effect. Fixed seed: part of the registration. */
export function predictiveInterval(funded: readonly Intervention[], n = 20_000): { p10: number; mean: number; p90: number } {
  const r = rng(0); const tot = new Float64Array(n);
  for (const i of funded) for (let k = 0; k < n; k++) { if (r.next() < i.confidence) tot[k] = (tot[k] ?? 0) + r.uniform(i.effectIfWorksGbp.low, i.effectIfWorksGbp.high); }
  const s = Array.from(tot).sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(n - 1, Math.floor(p * n))] ?? 0;
  return { p10: q(0.10), mean: s.reduce((a, b) => a + b, 0) / n, p90: q(0.90) };
}

export function preregister(id: string, funded: readonly Intervention[], registeredAt: string, prev: MeasurementPlan | null = null): MeasurementPlan {
  const pi = predictiveInterval(funded);
  const body: PlanBody = {
    id, version: prev ? prev.version + 1 : 1, supersedes: prev ? `${prev.id}@v${prev.version}` : null, registeredAt,
    interventionIds: funded.map((i) => i.id),
    hypotheses: funded.map((i) => `${i.id}: ${i.name} moves ${i.actsOn}`),
    primaryMetric: `room_revenue over ${WEEKS_POST} weeks vs synthetic-control counterfactual`,
    secondaryMetrics: funded.map((i) => `metric of ${i.actsOn} (${i.addresses.join(", ")})`),
    baseline: `${WEEKS_PRE} pre-intervention weeks; ${N_COMPARABLES} comparable properties; in-space placebo test`,
    expectedGbp: { low: Math.round(pi.p10), high: Math.round(pi.p90) }, expectedPointGbp: Math.round(pi.mean),
    windowWeeks: WEEKS_POST, counterfactualMethod: "synthetic control (non-negative weights summing to 1, fitted on the pre-period)",
    successRule: "VALIDATED if the 90 % interval excludes 0 and the point estimate lies within the expected range; PARTIALLY_VALIDATED if it excludes 0 but falls outside the range; NOT_VALIDATED if it includes 0",
    stoppingRule: "no early stop; no change of metric, window or rule after registration; any change creates a new version naming this one",
  };
  return { ...body, sha256: hashPlan(body) };
}

export function verifyPlan(p: MeasurementPlan): boolean {
  const { sha256, ...body } = p;
  return hashPlan(body) === sha256;
}
