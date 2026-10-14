/** C6 — continuity of committed interventions across cycles. SYNTHETIC property only. */
import { describe, it, expect } from "vitest";
import { runCycle, newModel, appendCycle, cycleInputFromModel, parseModel, serializeModel, recall, COUNTRY_HOUSE_34, type OpenIntervention } from "../index.js";

const T1 = "2026-10-14T09:00:00Z", T2 = "2026-10-21T09:00:00Z";
const open: OpenIntervention = { interventionId: "I-001", contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION", budgetStatus: "IN_EXECUTION", approvedGbp: 7_500, since: "2026-10-16T10:00:00Z", planId: "MP-001", awaitingMeasurement: false };

describe("C6 — an intervention in progress is not re-proposed, not re-budgeted, and is remembered", () => {
  it("the next cycle marks it IN_PROGRESS with its contract, keeps its approved budget, charges nothing to this cycle's budget and registers no new plan for it", () => {
    const before = runCycle({ seed: 2, budgetGbp: 16_000, now: T2, measure: false });
    expect(before.decision.selected).toContain("I-001");
    const r = runCycle({ seed: 2, budgetGbp: 16_000, now: T2, measure: false, openInterventions: [open] });
    const line = r.allocation.lines.find((l) => l.interventionId === "I-001")!; const rec = r.records.find((x) => x.id === "I-001")!;
    expect(line.status).toBe("IN_PROGRESS"); expect(line.funded).toBe(false); expect(line.allocatedGbp).toBe(0); expect(line.blockedBy[0]).toMatch(/contract INT-RUN-001-I-001 is IN_EXECUTION since 2026-10-16/);
    expect(r.decision.selected).not.toContain("I-001"); expect(r.plan?.interventionIds ?? []).not.toContain("I-001");
    expect(rec.decisionStatus).toBe("IN_PROGRESS"); expect(rec.budget.status).toBe("IN_EXECUTION"); expect(rec.budget.approved).toMatchObject({ amountGbp: 7_500, status: "OBSERVED" });
    expect(rec.measurementPlanId).toBe("MP-001"); expect(rec.startDate).toBe("2026-10-16T10:00:00Z"); expect(rec.package.decision).toMatch(/In progress/); expect(rec.outcome).toBeNull();
    expect(r.events.some((e) => e.type === "INTERVENTION_IN_PROGRESS" && e.refs.includes("I-001"))).toBe(true);
    expect(r.allocation.allocatedGbp).toBeLessThanOrEqual(before.allocation.allocatedGbp);
  });
  it("awaiting measurement: the required condition names the measurement record; a dependant stays blocked until it is measured", () => {
    const r = runCycle({ seed: 2, budgetGbp: 16_000, now: T2, measure: false, openInterventions: [{ ...open, state: "EXECUTED", awaitingMeasurement: true }] });
    const line = r.allocation.lines.find((l) => l.interventionId === "I-001")!;
    expect(line.requiredCondition).toMatch(/measurement record on INT-RUN-001-I-001/); expect(line.blockedBy[0]).toMatch(/awaiting its measurement record/);
    const dependant = r.records.find((x) => x.dependency.includes("I-001"));
    if (dependant) expect(["BLOCKED", "IN_PROGRESS", "INVESTIGATE", "REJECTED", "DEFERRED"]).toContain(dependant.decisionStatus);
  });
  it("memory records the execution state, recall says so, and the persisted model carries it across a restart (older models read as empty)", () => {
    const m0 = newModel(COUNTRY_HOUSE_34, T1);
    const r1 = runCycle({ seed: 1, budgetGbp: 16_000, now: T1, measure: false, ...cycleInputFromModel(m0) });
    const m1 = appendCycle(m0, r1, { id: "RUN-001", at: T1, jobKey: "cycle:1" });
    const r2 = runCycle({ seed: 2, budgetGbp: 16_000, now: T2, measure: false, ...cycleInputFromModel(m1), openInterventions: [open] });
    const m2 = appendCycle(m1, r2, { id: "RUN-002", at: T2, jobKey: "cycle:2" });
    expect(m2.cycles[1]!.inProgress).toEqual([{ interventionId: "I-001", contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION" }]); expect(m2.cycles[1]!.jobKey).toBe("cycle:2");
    expect(m2.memory.executions).toHaveLength(1); expect(m2.memory.executions[0]).toMatchObject({ contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION", approvedGbp: 7_500, recordedAt: T2 });
    expect(recall(m2.memory, "I-001", T2).statement).toMatch(/Currently IN_EXECUTION on INT-RUN-001-I-001 since 2026-10-16 \(budget IN_EXECUTION, approved £7,500\)/);
    const r3 = runCycle({ seed: 3, budgetGbp: 16_000, now: "2026-10-28T09:00:00Z", measure: false, ...cycleInputFromModel(m2), openInterventions: [{ ...open, state: "EXECUTED", awaitingMeasurement: true }] });
    const m3 = appendCycle(m2, r3, { id: "RUN-003", at: "2026-10-28T09:00:00Z" });
    expect(m3.memory.executions).toHaveLength(1); expect(m3.memory.executions[0]!.state).toBe("EXECUTED");   // one entry per contract, replaced as it moves
    const roundTrip = parseModel(serializeModel(m3)); expect(roundTrip.memory.executions).toEqual(m3.memory.executions);
    const legacy = JSON.parse(serializeModel(m1)); delete legacy.memory.executions; for (const c of legacy.cycles) { delete c.inProgress; delete c.jobKey; }
    const parsed = parseModel(JSON.stringify(legacy)); expect(parsed.memory.executions).toEqual([]); expect(parsed.cycles[0]!.inProgress).toEqual([]); expect(parsed.cycles[0]!.jobKey).toBeNull();
  });
});
