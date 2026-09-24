/** The decision record: alternatives, selected, rejected with reasons, what would change it (machine-readable), governance level. */
import type { Allocation, ChangeCondition, Decision, Diagnosis, Intervention, VoiResult } from "./model.js";
import { expectedValue } from "./interventions.js";
import { LEVEL_NAME, LEVEL_TIER } from "./governance.js";

/**
 * Governance level of the decision as a whole (L0–L4, see governance.ts). Any funded spend is a financial
 * commitment: L3, human approval required. Nothing funded and nothing to investigate: L0. Only investigations
 * (information purchases) recommended: L2. Reversible actions under £1,000 in total: L1.
 */
export function governanceLevel(items: readonly Intervention[], alloc: Allocation): Decision["governance"] {
  const funded = items.filter((i) => alloc.lines.some((l) => l.interventionId === i.id && l.funded));
  const investigate = alloc.lines.some((l) => l.status === "INVESTIGATE");
  if (!funded.length) return investigate ? { level: 2, reason: `nothing funded; the system recommends an information purchase before committing capital (${LEVEL_NAME[2]}, ${LEVEL_TIER[2]})` } : { level: 0, reason: `nothing is funded: the system observes and reports (${LEVEL_NAME[0]}, ${LEVEL_TIER[0]})` };
  const spend = funded.reduce((a, i) => a + i.costGbp, 0);
  if (funded.every((i) => i.reversibility === "High") && spend <= 1_000) return { level: 1, reason: `reversible actions totalling £${spend.toLocaleString("en-GB")} ≤ £1,000 (${LEVEL_NAME[1]}, ${LEVEL_TIER[1]})` };
  return { level: 3, reason: `financial commitment £${spend.toLocaleString("en-GB")}: ${LEVEL_NAME[3]} (${LEVEL_TIER[3]}); the system recommends and records, a human approves before anything is executed` };
}

export function buildDecision(id: string, question: string, d: Diagnosis, items: readonly Intervention[], voi: readonly VoiResult[], alloc: Allocation, at: string, extraConditions: readonly ChangeCondition[] = []): Decision {
  const selected = alloc.lines.filter((l) => l.funded).map((l) => l.interventionId);
  const rejected = alloc.lines.filter((l) => !l.funded).map((l) => ({ id: l.interventionId, reasons: l.blockedBy }));
  const binding = d.constraints.find((c) => c.id === d.binding);
  const ev = alloc.lines.filter((l) => l.funded).reduce((a, l) => a + l.expectedValueGbp, 0);
  const fundedItems = items.filter((i) => selected.includes(i.id));
  const conf = fundedItems.length ? fundedItems.reduce((a, i) => a + i.confidence * i.costGbp, 0) / fundedItems.reduce((a, i) => a + i.costGbp, 0) : 0;

  const wouldChangeIf: ChangeCondition[] = [...extraConditions];
  if (binding && binding.gapGbp.high > 0) wouldChangeIf.push({ metric: binding.metric, operator: ">=", threshold: binding.benchmark, why: `${binding.factor} would no longer bind (benchmark reached)`, interventionId: null, fromStatus: null, toStatus: null, basis: "benchmark" });
  for (const i of fundedItems) {
    const mid = (i.effectIfWorksGbp.low + i.effectIfWorksGbp.high) / 2; const breakEven = mid > 0 ? i.costGbp / mid : 1;
    if (breakEven < i.confidence) wouldChangeIf.push({ metric: `${i.id}.confidence`, operator: "<", threshold: Number(breakEven.toFixed(2)), why: `expected value of ${i.id} turns negative below this confidence (cost £${i.costGbp.toLocaleString("en-GB")} ÷ mid effect £${mid.toFixed(0)})`, interventionId: i.id, fromStatus: "FUNDED", toStatus: "REJECTED", basis: "break_even" });
  }
  for (const l of alloc.lines.filter((x) => !x.funded)) {
    if (l.requiredCondition && !wouldChangeIf.some((c) => c.interventionId === l.interventionId)) wouldChangeIf.push({ metric: `${l.interventionId}.condition`, operator: ">=", threshold: 1, why: `${l.interventionId} (${l.status}) unblocks when: ${l.requiredCondition}`, interventionId: l.interventionId, fromStatus: l.status, toStatus: null, basis: "condition" });
  }

  return {
    id, timestamp: at, question,
    alternatives: items.map((i) => i.id), selected, rejected,
    constraints: d.constraints.map((c) => c.id),
    evidence: [...new Set([...d.evidence, ...items.flatMap((i) => i.evidence)])],
    assumptions: [d.dedupMethod, "effect ranges are fractions of the constraint gaps (declared)", "confidence values are declared priors adjusted by measured learning records and by data quality", ...voi.map((v) => `${v.interventionId}: ${v.decision} — ${v.reason}`)],
    expectedValueGbp: ev, confidence: conf,
    confidenceBasis: fundedItems.length ? "cost-weighted mean of the funded interventions' confidence (calibration and data quality applied)" : "no funded intervention",
    wouldChangeIf, governance: governanceLevel(items, alloc),
  };
}

export const planExpectedValue = (items: readonly Intervention[], alloc: Allocation): number =>
  items.filter((i) => alloc.lines.some((l) => l.interventionId === i.id && l.funded)).reduce((a, i) => a + expectedValue(i), 0);
