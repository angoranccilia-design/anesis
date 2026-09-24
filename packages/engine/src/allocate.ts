/**
 * PRIORITISE / DECIDE — risk-adjusted capital allocation with explicit blocking and a status per intervention.
 *
 * Score = (expected value − λ × downside) × reversibility × strategic dependency, ranked per £ of cost.
 * Statuses: FUNDED · BLOCKED (a causal dependency is unresolved) · INVESTIGATE (information is worth more than acting)
 * · REJECTED (negative value that information would not fix) · DEFERRED (budget). The reserve is never allocated.
 * Causal chain: demand → conversion → capacity → operational. An action on a factor is blocked while a downstream
 * factor's attainment is more than ten points lower — unless memory shows that constraint measured resolved.
 */
import type { Allocation, AllocationLine, Diagnosis, Intervention, InterventionStatus, VoiResult } from "./model.js";
import { expectedValue } from "./interventions.js";
import { PARAMS, type Params } from "./benchmarks.js";

/** Causal chain: the output of a factor is consumed by the next one. */
export const CHAIN: readonly string[] = ["demand", "conversion", "capacity", "service_capacity", "operational"];
export const CONSUMED_BY: Readonly<Record<string, string>> = { demand: "conversion", conversion: "capacity", capacity: "service_capacity", service_capacity: "operational", offpeak_demand: "conversion" };

export function riskAdjustedValue(i: Intervention, all: readonly Intervention[], P: Params = PARAMS): number {
  const downside = (1 - i.confidence) * i.costGbp + i.confidence * Math.max(0, i.costGbp - i.effectIfWorksGbp.low);
  const dependency = all.some((o) => o.mustFollow.includes(i.id)) ? P.strategicDependencyWeight : 1;
  return (expectedValue(i) - P.downsidePenalty * downside) * P.reversibility[i.reversibility] * dependency;
}

import type { RequirementsResult } from "./requirements.js";
export interface AllocateOptions { readonly resolvedConstraints?: readonly { constraintId: string; by: string; at: string }[]; readonly qualityFactor?: (interventionId: string) => number; readonly requirements?: Readonly<Record<string, RequirementsResult>> }

export function allocate(items: readonly Intervention[], d: Diagnosis, voi: readonly VoiResult[], budgetGbp: number, P: Params = PARAMS, opts: AllocateOptions = {}): Allocation {
  const reserve = budgetGbp * P.reserveShare, usable = budgetGbp - reserve;
  const resolved = opts.resolvedConstraints ?? [];
  const byFactor = (f: string) => d.constraints.find((c) => c.factor === f);
  const ranked = [...items].sort((a, b) => riskAdjustedValue(b, items, P) / b.costGbp - riskAdjustedValue(a, items, P) / a.costGbp);
  const funded: string[] = []; let spent = 0; const lines: AllocationLine[] = [];
  for (const i of ranked) {
    const rav = riskAdjustedValue(i, items, P), ev = expectedValue(i);
    const blocked: string[] = []; let condition: string | null = null; let status: InterventionStatus | null = null;
    const factor = byFactor(i.actsOn);
    // causal dependency walk
    let f = i.actsOn;
    const offPeak = i.actsOn === "offpeak_demand";
    const factorForWalk = factor ?? (offPeak ? byFactor("demand") : undefined);
    while (factorForWalk && CONSUMED_BY[f]) {
      if (offPeak && CONSUMED_BY[f] === "capacity") break; // off-peak demand does not consume peak capacity
      const next = CONSUMED_BY[f]!; const consumer = byFactor(next);
      if (consumer && consumer.attainment + 0.1 < factorForWalk.attainment) {
        const res = resolved.find((r) => r.constraintId === consumer.id);
        if (res) { blocked.length; /* no block */ }
        else {
          blocked.push(`acts on ${i.actsOn} (attainment ${(factorForWalk.attainment * 100).toFixed(0)} %) whose output is consumed by ${consumer.factor} (${consumer.kind}, attainment ${(consumer.attainment * 100).toFixed(0)} %${consumer.id === d.binding ? ", the binding constraint" : ""}); ${consumer.kind === "CAPACITY" || consumer.kind === "OPERATIONAL" ? "demand exists, but incremental acquisition would currently collide with an operational capacity constraint (" + consumer.name.replace("Service capacity — ", "") + ")" : "the added " + i.actsOn + " is converted at the current sub-benchmark rate"}`);
          condition ??= `${consumer.metric} ${consumer.kind === "CAPACITY" || consumer.kind === "OPERATIONAL" ? "relieved (headroom restored)" : `≥ ${consumer.benchmark} (benchmark)`} or ${consumer.id} measured resolved`;
          status ??= "BLOCKED";
        }
      }
      f = next;
    }
    // a dependency is moot when the constraint it addresses shows no gap (attainment 1), or memory shows it measured resolved
    const missing = i.mustFollow.filter((m) => {
      const dep = items.find((x) => x.id === m); const c0 = dep && d.constraints.find((c) => c.id === dep.addresses[0]);
      return !funded.includes(m) && !(c0 && c0.attainment >= 1) && !resolved.some((r) => dep?.addresses.includes(r.constraintId));
    });
    if (missing.length) { blocked.push(`must follow ${missing.join(", ")} (causal dependency: acts on bookings that ${missing.join(", ")} must first make possible)`); condition ??= `${missing.join(", ")} funded and measured`; status ??= "BLOCKED"; }
    const req = opts.requirements?.[i.id];
    if (req && req.verdict !== "SUFFICIENT") { blocked.push(req.note); condition ??= req.verdict === "INVESTIGATE" ? `${req.missingCritical.join(", ")} obtained (see the study named) and decision re-run` : `connect the system holding: ${req.missingCritical.join(", ")}`; status ??= req.verdict === "INVESTIGATE" ? "INVESTIGATE" : "BLOCKED"; }
    const v = voi.find((x) => x.interventionId === i.id);
    if (v && v.decision === "COLLECT_MORE_INFORMATION") { blocked.push(`value of information: ${v.reason}`); condition ??= `${i.informationOption?.name ?? "information"} completed and decision re-run`; status ??= "INVESTIGATE"; }
    if (v && v.decision === "DO_NOT_ACT") { blocked.push(`value of information: ${v.reason}`); condition ??= "assumptions change (see 'what would change this decision')"; status ??= "REJECTED"; }
    if (rav <= 0) { blocked.push(`risk-adjusted value £${rav.toFixed(0)} ≤ 0 (λ = ${P.downsidePenalty}, reversibility ${i.reversibility})`); condition ??= "confidence or effect range revised upward by measurement"; status ??= "REJECTED"; }
    if (!blocked.length && spent + i.costGbp > usable) { blocked.push(`exceeds usable budget: £${(usable - spent).toFixed(0)} left after reserve £${reserve.toFixed(0)}`); condition = "next budget cycle or a reallocation decision"; status = "DEFERRED"; }
    const ok = blocked.length === 0;
    if (ok) { funded.push(i.id); spent += i.costGbp; }
    lines.push({ interventionId: i.id, allocatedGbp: ok ? i.costGbp : 0, riskAdjustedValueGbp: rav, expectedValueGbp: ev, funded: ok, status: ok ? "FUNDED" : (status ?? "REJECTED"), blockedBy: blocked, requiredCondition: condition, qualityFactor: opts.qualityFactor?.(i.id) ?? 1 });
  }
  return { budgetGbp, reserveGbp: reserve, lines, allocatedGbp: spent,
    formula: `score = (confidence × mid effect − cost − ${P.downsidePenalty} × downside) × reversibility{High 1, Medium 0.8, Low 0.6} × dependency{${P.strategicDependencyWeight} if others must follow}; ranked by score ÷ cost; reserve ${P.reserveShare * 100} % never allocated; chain ${CHAIN.join(" → ")}` };
}
