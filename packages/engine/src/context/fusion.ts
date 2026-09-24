/**
 * EXTERNAL SIGNAL FUSION — signals are not separate dashboards. Assessments that overlap in time are combined
 * and the combined magnitude is tested for relevance; a cluster of small effects can matter when one does not.
 * Output per domain and for the near-term cluster: FORWARD_EXPOSURE, COMMERCIAL_OPPORTUNITY or NO_DECISION_IMPACT.
 */
import type { CommercialAssessment, Domain, ExternalSignal, Perturbation } from "./types.js";
import { assessRelevance, type DecisionSignature, type RelevanceResult } from "./relevance.js";

export interface FusedVerdict {
  readonly id: string;
  readonly scope: string;                      // "weather" | "near-term (≤ 30 d)" | …
  readonly domains: readonly Domain[];
  readonly assessmentIds: readonly string[];
  readonly direction: "up" | "down" | "mixed" | "none";
  readonly combinedEffectGbp: { readonly low: number; readonly high: number };
  readonly relevance: RelevanceResult;
  readonly verdict: "FORWARD_EXPOSURE" | "COMMERCIAL_OPPORTUNITY" | "NO_DECISION_IMPACT" | "TACTICAL_NOTE";
  readonly statement: string;
}

const mergePerturbation = (as: readonly CommercialAssessment[]): Partial<Perturbation> => {
  const out: Record<string, number> = {};
  for (const a of as) for (const [k, v] of Object.entries(a.perturbation ?? {})) {
    if (v === undefined) continue;
    const isFactor = k.endsWith("Factor");
    out[k] = isFactor ? (out[k] ?? 1) * v : (out[k] ?? 0) + v;
  }
  return out as Partial<Perturbation>;
};

function combine(id: string, scope: string, as: readonly CommercialAssessment[], signals: readonly ExternalSignal[], revenue: number, baseline: DecisionSignature, reevaluate: (p: Partial<Perturbation>) => DecisionSignature): FusedVerdict {
  const sign = (a: CommercialAssessment) => (a.direction === "down" ? -1 : a.direction === "up" ? 1 : 0);
  const lo = as.reduce((s, a) => s + sign(a) * a.commercialEffectGbp.low, 0), hi = as.reduce((s, a) => s + sign(a) * a.commercialEffectGbp.high, 0);
  const net = (lo + hi) / 2;
  const direction: FusedVerdict["direction"] = as.every((a) => a.direction === "none") ? "none" : Math.abs(net) < 1e-9 ? "mixed" : net > 0 ? "up" : "down";
  const combined: CommercialAssessment = {
    id, domain: as[0]?.domain ?? "weather", signalIds: as.flatMap((a) => a.signalIds), headline: scope, affectedDemandType: "combined", affectedCapacity: "combined", direction,
    commercialEffectGbp: { low: Math.min(Math.abs(lo), Math.abs(hi)), high: Math.max(Math.abs(lo), Math.abs(hi)) }, horizonDays: Math.max(0, ...as.map((a) => a.horizonDays)),
    causalPlausibility: as.length ? Math.min(...as.map((a) => a.causalPlausibility)) : 0.25, plausibilityBasis: "minimum of the fused assessments", confidence: as.length ? Math.min(...as.map((a) => a.confidence)) : 0,
    formula: "signed sum of assessment effects; relevance on the net", assumptions: [], perturbation: as.some((a) => a.perturbation) ? mergePerturbation(as) : null, evidence: [],
  };
  const rel = assessRelevance(combined, signals, revenue, baseline, reevaluate);
  const verdict: FusedVerdict["verdict"] = rel.verdict === "NO_MATERIAL_DECISION_IMPACT" ? "NO_DECISION_IMPACT" : rel.verdict === "MATERIAL_NO_DECISION_CHANGE" ? "TACTICAL_NOTE" : direction === "down" ? "FORWARD_EXPOSURE" : "COMMERCIAL_OPPORTUNITY";
  const statement = verdict === "NO_DECISION_IMPACT"
    ? `${scope}: NO MATERIAL DECISION IMPACT (expected £${rel.expectedGbp.toFixed(0)} against a materiality of £${rel.materialityGbp.toFixed(0)}).`
    : verdict === "TACTICAL_NOTE" ? `${scope}: material (£${rel.expectedGbp.toFixed(0)} expected) but the capital decision does not change — handle tactically.`
    : `${scope}: ${verdict.replace("_", " ").toLowerCase()} — ${rel.changedWhat}.`;
  return { id, scope, domains: [...new Set(as.map((a) => a.domain))], assessmentIds: as.map((a) => a.id), direction, combinedEffectGbp: { low: lo, high: hi }, relevance: rel, verdict, statement };
}

export function fuse(assessments: readonly CommercialAssessment[], signals: readonly ExternalSignal[], annualRoomRevenueGbp: number, baseline: DecisionSignature, reevaluate: (p: Partial<Perturbation>) => DecisionSignature): FusedVerdict[] {
  const out: FusedVerdict[] = [];
  const domains = [...new Set(assessments.map((a) => a.domain))];
  for (const d of domains) out.push(combine(`FV-${d.toUpperCase()}`, d, assessments.filter((a) => a.domain === d), signals, annualRoomRevenueGbp, baseline, reevaluate));
  const near = assessments.filter((a) => a.horizonDays <= 30 && a.direction !== "none");
  if (near.length > 1) out.push(combine("FV-NEAR-TERM", "near-term (≤ 30 days), all domains", near, signals, annualRoomRevenueGbp, baseline, reevaluate));
  return out;
}
