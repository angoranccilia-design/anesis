/** The decision record: alternatives, selected, rejected with reasons, what would change it, governance level. */
import type { Allocation, ChangeCondition, Decision, Diagnosis, Intervention, VoiResult } from "./model.js";
import { expectedValue } from "./interventions.js";

/**
 * Governance level (brief §28), mapped by the application onto @anesis/policy tiers:
 * 0 observe only · 1 recommend · 2 execute reversible, low-cost actions with human review · 3 execute within bounds · 4 execute, escalate on anomaly.
 * In this environment nothing executes: the engine only simulates, so the highest level it ever emits is 1 for spend and 2 for reversible actions.
 */
export function governanceLevel(items: readonly Intervention[], alloc: Allocation): Decision["governance"] {
  const funded = items.filter((i) => alloc.lines.some((l) => l.interventionId === i.id && l.funded));
  if (!funded.length) return { level: 0, reason: "nothing is funded: the system observes and reports" };
  const spend = funded.reduce((a, i) => a + i.costGbp, 0);
  if (funded.every((i) => i.reversibility === "High") && spend <= 5_000) return { level: 2, reason: `all funded actions are reversible and total spend £${spend.toLocaleString("en-GB")} ≤ £5,000: executable with human review` };
  return { level: 1, reason: `spend £${spend.toLocaleString("en-GB")} or reversibility below High: the system recommends; a human approves before anything is executed` };
}

export function buildDecision(id: string, question: string, d: Diagnosis, items: readonly Intervention[], voi: readonly VoiResult[], alloc: Allocation, at: string): Decision {
  const selected = alloc.lines.filter((l) => l.funded).map((l) => l.interventionId);
  const rejected = alloc.lines.filter((l) => !l.funded).map((l) => ({ id: l.interventionId, reasons: l.blockedBy }));
  const binding = d.constraints.find((c) => c.id === d.binding);
  const ev = alloc.lines.filter((l) => l.funded).reduce((a, l) => a + l.expectedValueGbp, 0);
  const fundedItems = items.filter((i) => selected.includes(i.id));
  const conf = fundedItems.length ? fundedItems.reduce((a, i) => a + i.confidence * i.costGbp, 0) / fundedItems.reduce((a, i) => a + i.costGbp, 0) : 0;

  const wouldChangeIf: ChangeCondition[] = [];
  if (binding) wouldChangeIf.push({ metric: binding.metric, operator: ">=", threshold: binding.benchmark, why: `${binding.factor} would no longer bind; demand-side actions currently blocked would be re-evaluated` });
  for (const i of fundedItems) {
    // confidence at which expected value crosses zero
    const mid = (i.effectIfWorksGbp.low + i.effectIfWorksGbp.high) / 2;
    const breakEven = mid > 0 ? i.costGbp / mid : 1;
    if (breakEven < i.confidence) wouldChangeIf.push({ metric: `${i.id}.confidence`, operator: "<", threshold: Number(breakEven.toFixed(2)), why: `expected value of ${i.id} turns negative below this confidence (cost £${i.costGbp.toLocaleString("en-GB")} ÷ mid effect £${mid.toFixed(0)})` });
  }
  for (const l of alloc.lines.filter((x) => !x.funded)) {
    const i = items.find((k) => k.id === l.interventionId);
    if (i && l.requiredCondition) wouldChangeIf.push({ metric: `${i.id}.condition`, operator: ">=", threshold: 1, why: `${i.id} unblocks when: ${l.requiredCondition}` });
  }

  return {
    id, timestamp: at, question,
    alternatives: items.map((i) => i.id), selected, rejected,
    constraints: d.constraints.map((c) => c.id),
    evidence: [...new Set([...d.evidence, ...items.flatMap((i) => i.evidence)])],
    assumptions: [
      d.dedupMethod,
      "effect ranges are fractions of the constraint gaps (declared)",
      "confidence values are declared priors adjusted only by measured learning records",
      ...voi.map((v) => `${v.interventionId}: ${v.decision} — ${v.reason}`),
    ],
    expectedValueGbp: ev, confidence: conf,
    confidenceBasis: fundedItems.length ? "cost-weighted mean of the funded interventions' declared confidence" : "no funded intervention",
    wouldChangeIf, governance: governanceLevel(items, alloc),
  };
}

export const planExpectedValue = (items: readonly Intervention[], alloc: Allocation): number =>
  items.filter((i) => alloc.lines.some((l) => l.interventionId === i.id && l.funded)).reduce((a, i) => a + expectedValue(i), 0);
