/**
 * PRIORITISE / DECIDE — risk-adjusted capital allocation with explicit blocking.
 *
 * Score = (expected value − λ × downside) × reversibility × strategic dependency, ranked per £ of cost.
 * A line is BLOCKED, with the reason and the condition that would unblock it, when it acts on a
 * non-binding factor upstream of the binding one, when it must follow an unfunded intervention, when
 * the value-of-information rule says to collect information first, when its risk-adjusted value is ≤ 0,
 * or when it exceeds the usable budget after reserve. The reserve is never allocated.
 */
import type { Allocation, AllocationLine, Diagnosis, Intervention, VoiResult } from "./model.js";
import { expectedValue } from "./interventions.js";
import { PARAMS, type Params } from "./benchmarks.js";

/** Causal chain: the output of a factor is consumed by the next one. Demand only becomes bookings through conversion. */
export const CONSUMED_BY: Readonly<Record<string, string>> = { demand: "conversion" };

export function riskAdjustedValue(i: Intervention, all: readonly Intervention[], P: Params = PARAMS): number {
  const downside = (1 - i.confidence) * i.costGbp + i.confidence * Math.max(0, i.costGbp - i.effectIfWorksGbp.low);
  const dependency = all.some((o) => o.mustFollow.includes(i.id)) ? P.strategicDependencyWeight : 1;
  return (expectedValue(i) - P.downsidePenalty * downside) * P.reversibility[i.reversibility] * dependency;
}

export function allocate(items: readonly Intervention[], d: Diagnosis, voi: readonly VoiResult[], budgetGbp: number, P: Params = PARAMS): Allocation {
  const reserve = budgetGbp * P.reserveShare, usable = budgetGbp - reserve;
  const byId = (id: string) => d.constraints.find((c) => c.id === id);
  const binding = d.binding ? byId(d.binding) : undefined;
  const ranked = [...items].sort((a, b) => riskAdjustedValue(b, items, P) / b.costGbp - riskAdjustedValue(a, items, P) / a.costGbp);
  const funded: string[] = []; let spent = 0; const lines: AllocationLine[] = [];
  for (const i of ranked) {
    const rav = riskAdjustedValue(i, items, P), ev = expectedValue(i);
    const blocked: string[] = []; let condition: string | null = null;
    const factor = d.constraints.find((c) => c.factor === i.actsOn);
    const consumerFactor = CONSUMED_BY[i.actsOn];
    const consumer = consumerFactor ? d.constraints.find((c) => c.factor === consumerFactor) : undefined;
    if (factor && consumer && consumer.attainment + 0.1 < factor.attainment) {
      blocked.push(`acts on ${factor.factor} (attainment ${(factor.attainment * 100).toFixed(0)} %) whose output is consumed by ${consumer.factor} (attainment ${(consumer.attainment * 100).toFixed(0)} %${consumer.id === binding?.id ? ", the binding constraint" : ""}); the added ${factor.factor} is converted at the current sub-benchmark rate`);
      condition = `${consumer.metric} ≥ ${consumer.benchmark} (benchmark) or ${consumer.id} measured resolved`;
    }
    const missing = i.mustFollow.filter((m) => !funded.includes(m));
    if (missing.length) { blocked.push(`must follow ${missing.join(", ")} (causal dependency: acts on bookings that ${missing.join(", ")} must first make possible)`); condition ??= `${missing.join(", ")} funded and measured`; }
    const v = voi.find((x) => x.interventionId === i.id);
    if (v && v.decision === "COLLECT_MORE_INFORMATION") { blocked.push(`value of information: ${v.reason}`); condition ??= `${i.informationOption?.name ?? "information"} completed and decision re-run`; }
    if (v && v.decision === "DO_NOT_ACT") { blocked.push(`value of information: ${v.reason}`); condition ??= "assumptions change (see 'what would change this decision')"; }
    if (rav <= 0) { blocked.push(`risk-adjusted value £${rav.toFixed(0)} ≤ 0 (λ = ${P.downsidePenalty}, reversibility ${i.reversibility})`); condition ??= "confidence or effect range revised upward by measurement"; }
    if (!blocked.length && spent + i.costGbp > usable) { blocked.push(`exceeds usable budget: £${(usable - spent).toFixed(0)} left after reserve £${reserve.toFixed(0)}`); condition = "next budget cycle or a reallocation decision"; }
    const ok = blocked.length === 0;
    if (ok) { funded.push(i.id); spent += i.costGbp; }
    lines.push({ interventionId: i.id, allocatedGbp: ok ? i.costGbp : 0, riskAdjustedValueGbp: rav, expectedValueGbp: ev, funded: ok, blockedBy: blocked, requiredCondition: condition });
  }
  return { budgetGbp, reserveGbp: reserve, lines, allocatedGbp: spent,
    formula: `score = (confidence × mid effect − cost − ${P.downsidePenalty} × downside) × reversibility{High 1, Medium 0.8, Low 0.6} × dependency{${P.strategicDependencyWeight} if others must follow}; ranked by score ÷ cost; reserve ${P.reserveShare * 100} % never allocated` };
}
