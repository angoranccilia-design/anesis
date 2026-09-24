/**
 * DECISION SENSITIVITY — which uncertainty, within its PLAUSIBLE range, is most capable of changing the actual decision?
 * Each variable is evaluated at the bounds of its plausible range (plausible.ts), the decision re-run each time. Variables
 * are ranked first by whether they flip the decision inside their range, then by the value swing. Thresholds are found by
 * bisection INSIDE the plausible range; outside it, no threshold is claimed.
 */
import type { PropertySpec } from "./property.js";
import type { BenchMap } from "./benchmarks.js";
import type { PlausibleRange } from "./plausible.js";

export interface DecisionEval { readonly binding: string | null; readonly funded: readonly string[]; readonly blocked: readonly string[]; readonly statuses: Readonly<Record<string, string>>; readonly expectedValueGbp: number }
export type Evaluator = (spec: PropertySpec, bench: BenchMap) => DecisionEval;

export interface SensitivityRow { readonly variable: string; readonly label: string; readonly current: number; readonly low: number; readonly high: number; readonly rangeSource: string; readonly rangeConfidence: number; readonly evLow: number; readonly evHigh: number; readonly evSwingGbp: number; readonly flipsDecision: boolean; readonly flipNote: string }

const withVar = (spec: PropertySpec, bench: BenchMap, v: PlausibleRange, value: number): [PropertySpec, BenchMap] => v.kind === "spec" ? [{ ...spec, [v.key]: value } as PropertySpec, bench] : [spec, { ...bench, [v.key]: value }];
const sig = (e: DecisionEval) => `${e.binding}|${e.funded.join(",")}|${e.blocked.join(",")}|${Object.entries(e.statuses).map(([k, v]) => k + v).join(",")}`;

export function sensitivity(spec: PropertySpec, bench: BenchMap, ranges: readonly PlausibleRange[], evaluate: Evaluator): SensitivityRow[] {
  const base = evaluate(spec, bench);
  const rows = ranges.map((v) => {
    const eLo = evaluate(...withVar(spec, bench, v, v.min)), eHi = evaluate(...withVar(spec, bench, v, v.max));
    const flips = sig(eLo) !== sig(base) || sig(eHi) !== sig(base);
    return { variable: v.key, label: v.label, current: v.central, low: v.min, high: v.max, rangeSource: v.source, rangeConfidence: v.confidence, evLow: eLo.expectedValueGbp, evHigh: eHi.expectedValueGbp, evSwingGbp: Math.abs(eHi.expectedValueGbp - eLo.expectedValueGbp), flipsDecision: flips,
      flipNote: flips ? `at ${v.min}: [${eLo.funded}] / ${Object.entries(eLo.statuses).filter(([k, s]) => s !== base.statuses[k]).map(([k, s]) => `${k} ${s}`).join(", ") || "same statuses"}; at ${v.max}: [${eHi.funded}] / ${Object.entries(eHi.statuses).filter(([k, s]) => s !== base.statuses[k]).map(([k, s]) => `${k} ${s}`).join(", ") || "same statuses"}` : "decision unchanged across the plausible range" };
  });
  return rows.sort((a, b) => Number(b.flipsDecision) - Number(a.flipsDecision) || b.evSwingGbp - a.evSwingGbp);
}

export interface Threshold { readonly variable: string; readonly label: string; readonly from: number; readonly to: number; readonly fromStatus: string; readonly toStatus: string; readonly interventionId: string; readonly direction: "up" | "down"; readonly withinPlausible: true; readonly plausibleMin: number; readonly plausibleMax: number }

/** Value of `variable` inside its plausible range at which `interventionId`'s status changes; null if it does not change within the range. */
export function threshold(spec: PropertySpec, bench: BenchMap, ranges: readonly PlausibleRange[], evaluate: Evaluator, variable: string, interventionId: string, direction: "up" | "down" = "up", iters = 40): Threshold | null {
  const v = ranges.find((x) => x.key === variable); if (!v) return null;
  const status = (val: number) => evaluate(...withVar(spec, bench, v, val)).statuses[interventionId] ?? "?";
  const s0 = status(v.central); const bound = direction === "up" ? v.max : v.min;
  if (status(bound) === s0) return null;
  let a = v.central, b = bound;
  for (let i = 0; i < iters; i++) { const m = (a + b) / 2; if (status(m) === s0) a = m; else b = m; }
  return { variable, label: v.label, from: v.central, to: b, fromStatus: s0, toStatus: status(b), interventionId, direction, withinPlausible: true, plausibleMin: v.min, plausibleMax: v.max };
}

export function ladder(spec: PropertySpec, bench: BenchMap, ranges: readonly PlausibleRange[], evaluate: Evaluator, variable: string, interventionId: string, direction: "up" | "down" = "up"): Threshold[] {
  const out: Threshold[] = []; let s = spec, b = bench; let rs = ranges; let guard = 0;
  for (;;) {
    const t = threshold(s, b, rs, evaluate, variable, interventionId, direction); if (!t || guard++ > 6) break;
    out.push(t); const v = rs.find((x) => x.key === variable)!;
    const next = t.to + (direction === "up" ? 1e-6 : -1e-6) * Math.max(1, Math.abs(t.to));
    [s, b] = withVar(s, b, v, next); rs = rs.map((x) => (x.key === variable ? { ...x, central: next } : x));
  }
  return out;
}

export interface DecisionSensitivity { readonly currentDecision: string; readonly mostSensitiveVariable: string | null; readonly plausibleRange: string | null; readonly decisionThreshold: string | null; readonly whatWouldChangeMyMind: string; readonly basis: string }

/** The founder's output: current decision, most decision-sensitive variable, plausible range, threshold, what would change my mind. */
export function decisionSensitivity(rows: readonly SensitivityRow[], thresholds: readonly Threshold[], currentDecision: string, focusInterventionId: string | null): DecisionSensitivity {
  const fmt = (v: string, x: number) => (v.toLowerCase().includes("conv") || v.toLowerCase().includes("share") || v.toLowerCase().includes("occupancy") || v.toLowerCase().includes("rate") || v.startsWith("substitution") ? `${(x * 100).toFixed(x < 0.1 ? 2 : 1)} %` : x >= 1000 ? `£${Math.round(x).toLocaleString("en-GB")}` : String(Number(x.toPrecision(3))));
  // prefer the variable that changes the status of the decision in focus; else any variable that flips something
  const top = (focusInterventionId ? rows.find((r) => r.flipsDecision && r.flipNote.includes(focusInterventionId)) : null) ?? rows.find((r) => r.flipsDecision) ?? null;
  const t = top ? thresholds.find((x) => x.variable === top.variable && (!focusInterventionId || x.interventionId === focusInterventionId)) ?? thresholds.find((x) => x.variable === top.variable) ?? null : null;
  return {
    currentDecision, mostSensitiveVariable: top ? top.label : null,
    plausibleRange: top ? `${fmt(top.variable, top.low)} → ${fmt(top.variable, top.high)} (${top.rangeSource}; confidence ${top.rangeConfidence})` : null,
    decisionThreshold: t ? `${fmt(t.variable, t.to)} (${t.interventionId}: ${t.fromStatus} → ${t.toStatus})` : null,
    whatWouldChangeMyMind: t ? `${t.label} ${t.direction === "up" ? "≥" : "≤"} ${fmt(t.variable, t.to)} under validated measurement conditions` : top ? `${top.label} moving to a bound of its plausible range (${top.flipNote})` : "no input flips the decision within its plausible range; new evidence (a measured cycle) would be needed",
    basis: "each input evaluated at the bounds of its plausible range with the decision re-run; ranked by flips inside the range, then by value swing; thresholds by bisection inside the range only",
  };
}
