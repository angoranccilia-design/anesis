/**
 * SIGNAL RELEVANCE ENGINE — every external assessment passes the same test before it may influence anything.
 *
 * Mathematics (documented in docs/EXTERNAL_INTELLIGENCE.md):
 *   R  = reliability  = completeness × source reliability × (0.5 if stale else 1)      ∈ [0, 1]
 *   C  = causal plausibility, declared per domain rule                                   ∈ {0.25, 0.5, 0.75, 1}
 *   M  = economic magnitude = midpoint of the assessment's £ effect over its horizon      ≥ 0
 *   E  = R × C × M   (expected £ effect, discounted for how much we should believe it)
 *   τ  = materiality threshold = max(0.5 % of annual room revenue, £1,000)              (declared)
 *   DIS = E ÷ τ      (decision impact score; ≥ 1 means material)
 *   Δ  = decision sensitivity: the decision is RE-RUN with the assessment's perturbation applied; Δ = 1 if the
 *        binding constraint, the funded set or the blocked set changes, else 0. This is a computation, not a score.
 * Verdicts:
 *   DIS < 1                 → NO_MATERIAL_DECISION_IMPACT (the signal exists; it does not matter now)
 *   DIS ≥ 1 and Δ = 0       → MATERIAL_NO_DECISION_CHANGE (worth a tactical note; the capital decision stands)
 *   DIS ≥ 1 and Δ = 1       → DECISION_IMPACT (feeds forward exposure or opportunity)
 */
import type { CommercialAssessment, ExternalSignal, Perturbation } from "./types.js";
import { qualityFactor } from "./types.js";

export interface DecisionSignature { readonly binding: string | null; readonly funded: readonly string[]; readonly blocked: readonly string[] }
export const sameSignature = (a: DecisionSignature, b: DecisionSignature): boolean => a.binding === b.binding && a.funded.join() === b.funded.join() && a.blocked.join() === b.blocked.join();

export interface RelevanceResult {
  readonly assessmentId: string;
  readonly reliability: number;
  readonly plausibility: number;
  readonly magnitudeGbp: number;
  readonly expectedGbp: number;
  readonly materialityGbp: number;
  readonly decisionImpactScore: number;
  readonly decisionChanged: boolean;
  readonly changedWhat: string;
  readonly timeHorizonDays: number;
  readonly uncertainty: string;
  readonly verdict: "NO_MATERIAL_DECISION_IMPACT" | "MATERIAL_NO_DECISION_CHANGE" | "DECISION_IMPACT";
  readonly formula: string;
}

export function materialityThreshold(annualRoomRevenueGbp: number): number { return Math.max(0.005 * annualRoomRevenueGbp, 1_000); }

export function assessRelevance(a: CommercialAssessment, signals: readonly ExternalSignal[], annualRoomRevenueGbp: number, baseline: DecisionSignature, reevaluate: (p: Partial<Perturbation>) => DecisionSignature): RelevanceResult {
  const sigs = signals.filter((s) => a.signalIds.includes(s.id));
  const R = sigs.length ? Math.min(...sigs.map((s) => qualityFactor(s.quality))) : 0;
  const M = Math.abs((a.commercialEffectGbp.low + a.commercialEffectGbp.high) / 2);
  const E = R * a.causalPlausibility * M;
  const tau = materialityThreshold(annualRoomRevenueGbp);
  const dis = E / tau;
  let changed = false, changedWhat = "no change: same binding constraint, same funded and blocked sets";
  if (a.perturbation && dis >= 1) {
    const after = reevaluate(a.perturbation);
    changed = !sameSignature(baseline, after);
    if (changed) changedWhat = `binding ${baseline.binding} → ${after.binding}; funded [${baseline.funded}] → [${after.funded}]; blocked [${baseline.blocked}] → [${after.blocked}]`;
  }
  const verdict: RelevanceResult["verdict"] = dis < 1 ? "NO_MATERIAL_DECISION_IMPACT" : changed ? "DECISION_IMPACT" : "MATERIAL_NO_DECISION_CHANGE";
  return {
    assessmentId: a.id, reliability: R, plausibility: a.causalPlausibility, magnitudeGbp: M, expectedGbp: E, materialityGbp: tau, decisionImpactScore: dis,
    decisionChanged: changed, changedWhat, timeHorizonDays: a.horizonDays,
    uncertainty: `effect range £${a.commercialEffectGbp.low.toFixed(0)}–£${a.commercialEffectGbp.high.toFixed(0)}; reliability ${R.toFixed(2)}; plausibility ${a.causalPlausibility} (${a.plausibilityBasis})`,
    verdict, formula: `E = R ${R.toFixed(2)} × C ${a.causalPlausibility} × M £${M.toFixed(0)} = £${E.toFixed(0)}; τ = £${tau.toFixed(0)}; DIS = ${dis.toFixed(2)}; Δ = ${changed ? 1 : 0} (decision re-run)`,
  };
}
