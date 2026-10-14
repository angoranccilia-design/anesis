/** After execution: an observed change is never an incremental result unless a pre-registered comparison supports it. */
import type { InterventionContract } from "./contract.js";
export interface OutcomeInput { readonly before: number | null; readonly after: number | null; readonly unit: string | null; readonly measurement: { readonly status: "ESTABLISHED" | "INCONCLUSIVE" | "NOT_MEASURABLE"; readonly planIntact: boolean; readonly incrementalPointGbp: number | null; readonly placeboPassed: boolean | null } | null }
export interface Outcome { readonly observedChange: number | null; readonly observedNote: string; readonly incrementality: "ESTABLISHED" | "NOT_ESTABLISHED" | "NOT_MEASURABLE"; readonly reason: string; readonly forecastErrorPct: number | null }
export function assessOutcome(c: InterventionContract, o: OutcomeInput): Outcome {
  const observed = o.before !== null && o.after !== null ? o.after - o.before : null;
  const observedNote = observed === null ? "before or after value unknown: no observed change can be stated" : `${c.measurement.primaryMetric} moved ${o.before} → ${o.after} ${o.unit ?? ""}`;
  if (!c.measurement.preregistration) return { observedChange: observed, observedNote, incrementality: "NOT_MEASURABLE", reason: "no pre-registered plan: the change is observed, incrementality cannot be established", forecastErrorPct: null };
  if (!o.measurement) return { observedChange: observed, observedNote, incrementality: "NOT_ESTABLISHED", reason: "no counterfactual measurement was run; an improvement after execution is not attributed to it", forecastErrorPct: null };
  if (!o.measurement.planIntact) return { observedChange: observed, observedNote, incrementality: "NOT_ESTABLISHED", reason: "the pre-registered plan was altered after the fact", forecastErrorPct: null };
  if (o.measurement.status !== "ESTABLISHED" || o.measurement.placeboPassed === false) return { observedChange: observed, observedNote, incrementality: "NOT_ESTABLISHED", reason: `measurement ${o.measurement.status}${o.measurement.placeboPassed === false ? ", placebo failed" : ""}: observed, not attributed`, forecastErrorPct: null };
  return { observedChange: observed, observedNote, incrementality: "ESTABLISHED", reason: "pre-registered synthetic-control comparison held and the placebo test passed", forecastErrorPct: null };
}
