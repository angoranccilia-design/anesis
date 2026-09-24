/**
 * SENSITIVITY — which assumption drives the result, and at what value a decision changes.
 * Both are computed by re-running the decision (diagnose → interventions → VOI → allocate) on perturbed inputs.
 * Nothing here is estimated by hand.
 */
import type { PropertySpec } from "./property.js";
import type { BenchMap } from "./benchmarks.js";

export interface DecisionEval { readonly binding: string | null; readonly funded: readonly string[]; readonly blocked: readonly string[]; readonly statuses: Readonly<Record<string, string>>; readonly expectedValueGbp: number }
export type Evaluator = (spec: PropertySpec, bench: BenchMap) => DecisionEval;

export interface SensitivityVariable { readonly key: string; readonly label: string; readonly kind: "spec" | "bench"; readonly current: number; readonly min: number; readonly max: number }
export interface SensitivityRow { readonly variable: string; readonly label: string; readonly current: number; readonly low: number; readonly high: number; readonly evLow: number; readonly evHigh: number; readonly evSwingGbp: number; readonly flipsDecision: boolean; readonly flipNote: string }

export const SENSITIVITY_VARIABLES = (spec: PropertySpec, bench: BenchMap): SensitivityVariable[] => [
  { key: "convMobile", label: "Mobile conversion", kind: "spec", current: spec.convMobile, min: 0.001, max: 0.06 },
  { key: "convDesktop", label: "Desktop conversion", kind: "spec", current: spec.convDesktop, min: 0.002, max: 0.08 },
  { key: "sessionsPerYear", label: "Website sessions", kind: "spec", current: spec.sessionsPerYear, min: 10_000, max: 600_000 },
  { key: "otaShare", label: "OTA share", kind: "spec", current: spec.otaShare, min: 0.05, max: 0.9 },
  { key: "adrGbp", label: "ADR", kind: "spec", current: spec.adrGbp, min: 60, max: 600 },
  { key: "occupancy", label: "Occupancy", kind: "spec", current: spec.occupancy, min: 0.3, max: 0.95 },
  { key: "repeatRate", label: "Repeat rate", kind: "spec", current: spec.repeatRate, min: 0.01, max: 0.5 },
  { key: "peakOccupancy", label: "Peak occupancy (capacity)", kind: "spec", current: spec.peakOccupancy, min: 0.5, max: 1.0 },
  { key: "conv.mobile.p50", label: "Benchmark mobile conversion p50", kind: "bench", current: bench["conv.mobile.p50"] ?? 0.012, min: 0.004, max: 0.03 },
  { key: "substitution_to_ota", label: "Substitution to OTA (dedup)", kind: "bench", current: bench["substitution_to_ota"] ?? 0.4, min: 0, max: 0.9 },
];

const withVar = (spec: PropertySpec, bench: BenchMap, v: SensitivityVariable, value: number): [PropertySpec, BenchMap] =>
  v.kind === "spec" ? [{ ...spec, [v.key]: value } as PropertySpec, bench] : [spec, { ...bench, [v.key]: value }];

const sig = (e: DecisionEval) => `${e.binding}|${e.funded.join(",")}|${e.blocked.join(",")}`;

/** ±20 % perturbation of each variable: EV swing and whether the decision flips. Ranked by swing. */
export function sensitivity(spec: PropertySpec, bench: BenchMap, evaluate: Evaluator): SensitivityRow[] {
  const base = evaluate(spec, bench);
  const rows = SENSITIVITY_VARIABLES(spec, bench).map((v) => {
    const lo = Math.max(v.min, v.current * 0.8), hi = Math.min(v.max, v.current * 1.2);
    const eLo = evaluate(...withVar(spec, bench, v, lo)), eHi = evaluate(...withVar(spec, bench, v, hi));
    const flips = sig(eLo) !== sig(base) || sig(eHi) !== sig(base);
    return { variable: v.key, label: v.label, current: v.current, low: lo, high: hi, evLow: eLo.expectedValueGbp, evHigh: eHi.expectedValueGbp, evSwingGbp: Math.abs(eHi.expectedValueGbp - eLo.expectedValueGbp), flipsDecision: flips,
      flipNote: flips ? `at −20 %: [${eLo.funded}] blocked [${eLo.blocked}]; at +20 %: [${eHi.funded}] blocked [${eHi.blocked}]` : "decision unchanged within ±20 %" };
  });
  return rows.sort((a, b) => b.evSwingGbp - a.evSwingGbp);
}

export interface Threshold { readonly variable: string; readonly label: string; readonly from: number; readonly to: number; readonly fromStatus: string; readonly toStatus: string; readonly interventionId: string; readonly direction: "up" | "down" }

/** Finds, by bisection, the value of `variable` at which `interventionId`'s status changes from its current one. */
export function threshold(spec: PropertySpec, bench: BenchMap, evaluate: Evaluator, variable: string, interventionId: string, direction: "up" | "down" = "up", iters = 40): Threshold | null {
  const v = SENSITIVITY_VARIABLES(spec, bench).find((x) => x.key === variable); if (!v) return null;
  const status = (val: number) => evaluate(...withVar(spec, bench, v, val)).statuses[interventionId] ?? "?";
  const s0 = status(v.current); const bound = direction === "up" ? v.max : v.min;
  if (status(bound) === s0) return null;
  let a = v.current, b = bound;
  for (let i = 0; i < iters; i++) { const m = (a + b) / 2; if (status(m) === s0) a = m; else b = m; }
  return { variable, label: v.label, from: v.current, to: b, fromStatus: s0, toStatus: status(b), interventionId, direction };
}

/** All status transitions of an intervention along one variable, from current to the bound (e.g. BLOCKED → INVESTIGATE → FUNDED). */
export function ladder(spec: PropertySpec, bench: BenchMap, evaluate: Evaluator, variable: string, interventionId: string, direction: "up" | "down" = "up"): Threshold[] {
  const out: Threshold[] = []; let s = spec, b = bench; let guard = 0;
  for (;;) {
    const t = threshold(s, b, evaluate, variable, interventionId, direction); if (!t || guard++ > 6) break;
    out.push(t); const v = SENSITIVITY_VARIABLES(s, b).find((x) => x.key === variable)!;
    [s, b] = withVar(s, b, v, t.to + (direction === "up" ? 1e-6 : -1e-6) * Math.max(1, Math.abs(t.to)));
  }
  return out;
}
