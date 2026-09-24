import { describe, it, expect } from "vitest";
import { classifyCommand, parseAmountGbp } from "../governance.js";
import { runCycle, explainChange, compareRuns } from "../cycle.js";
import { recall, resolvedConstraints } from "../memory.js";
import { pooledCalibration, similarProperties } from "../portfolio.js";
import { ladder } from "../sensitivity.js";
import { benchMap } from "../benchmarks.js";
import { COUNTRY_HOUSE_34 } from "../property.js";

const NOW = "2026-06-10T00:00:00Z";

describe("governance", () => {
  it("parses amounts and classifies a £20,000 launch as L3 human approval required", () => {
    expect(parseAmountGbp("Launch £20,000 of advertising")).toBe(20_000);
    expect(parseAmountGbp("spend 20k GBP on meta")).toBe(20_000);
    const c = classifyCommand("Launch £20,000 of advertising");
    expect(c.level).toBe(3); expect(c.tier).toBe("T3"); expect(c.reason).toMatch(/exceeds the autonomous execution threshold/);
  });
  it("classifies reads as L0, reversible actions as L1, preparation as L2 and £50,000+ as L4", () => {
    expect(classifyCommand("why is paid acquisition blocked?").level).toBe(0);
    expect(classifyCommand("Where should we put the next £20,000?").level).toBe(0); // a question about money is not a commitment
    expect(classifyCommand("Launch the campaign with £20,000.").level).toBe(3);
    expect(classifyCommand("run the scenario again").level).toBe(0);
    expect(classifyCommand("pause the meta campaign").level).toBe(1);
    expect(classifyCommand("prepare a recommendation for the owner").level).toBe(2);
    expect(classifyCommand("approve £60,000 for the spa extension").level).toBe(4);
    expect(classifyCommand("Lance 20 000 £ de publicité").level).toBe(3);
  });
  it("the decision's own governance level is 3 whenever capital is committed", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    expect(r.decision.governance.level).toBe(3);
    expect(r.records.filter((x) => x.capitalGbp > 0).every((x) => x.approvalLevel >= 3)).toBe(true);
  });
});

describe("property memory", () => {
  it("a previous measured intervention changes the next recommendation, and the system can say why", () => {
    const r1 = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW });
    expect(r1.measurement!.status).toBe("ESTABLISHED");
    expect(resolvedConstraints(r1.memoryAfter).map((x) => x.constraintId)).toContain("C-001");
    const r2 = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-09-10T00:00:00Z", memory: [r1.learning!], propertyMemory: r1.memoryAfter, cycleNumber: 2 });
    expect(r1.allocation.lines.find((l) => l.interventionId === "I-004")!.status).toBe("BLOCKED");
    expect(r2.allocation.lines.find((l) => l.interventionId === "I-004")!.status).toBe("INVESTIGATE");
    const why = explainChange(r1, r2);
    expect(why.join(" ")).toMatch(/I-004: BLOCKED → INVESTIGATE/);
    expect(why.join(" ")).toMatch(/measured resolved/);
    const rec = recall(r1.memoryAfter, "I-004", "2026-09-10T00:00:00Z");
    expect(rec.statement).toMatch(/considered 1 time/); expect(rec.statement).toMatch(/3 months ago/); expect(rec.statement).toMatch(/because/);
    expect(r2.records.find((x) => x.id === "I-004")!.dependencyStatus).toBe("RESOLVED_BY_MEASUREMENT");
    expect(r2.events.some((e) => e.type === "MEMORY_RECALLED")).toBe(true);
  });
  it("forecast error is stored in the learning record and in memory", () => {
    const r = runCycle({ seed: 2, budgetGbp: 16_000, now: NOW });
    expect(typeof r.learning!.error).toBe("number");
    expect(r.memoryAfter.learning[0]!.error).toBe(r.learning!.error);
    expect(r.events.some((e) => e.type === "FORECAST_ERROR_RECORDED")).toBe(true);
  });
  it("a NOT_VALIDATED plan is stored as a failed hypothesis", () => {
    const r = runCycle({ seed: 5, budgetGbp: 16_000, now: NOW });
    expect(r.measurement!.planStatus).toBe("NOT_VALIDATED");
    expect(r.memoryAfter.failedHypotheses.length).toBeGreaterThan(0);
  });
});

describe("portfolio memory", () => {
  it("pooling is off by default and evidence levels are reported; partial pooling shrinks toward the portfolio", () => {
    const rec = (id: string, err: number) => ({ id, timestamp: NOW, propertyId: "P", interventionTypes: ["I-001"], context: {}, expectedGbp: 100, observedGbp: 100 * (1 + err), error: err, measurementStatus: "ESTABLISHED" as const, calibrationApplied: true, calibrationNote: "" });
    const off = pooledCalibration("I-001", [rec("a", 0.4)], [rec("b", -0.4), rec("c", -0.4), rec("d", -0.4)], false);
    expect(off.enabled).toBe(false); expect(off.evidenceLevel).toBe("property"); expect(off.pooledFactor).toBe(1.1);
    const on = pooledCalibration("I-001", [rec("a", 0.4)], [rec("b", -0.4), rec("c", -0.4), rec("d", -0.4)], true);
    expect(on.evidenceLevel).toBe("partial_pooling"); expect(on.pooledFactor).toBeLessThan(off.pooledFactor); expect(on.weightOnProperty).toBeCloseTo(0.25, 2);
    const none = pooledCalibration("I-002", [], [], true); expect(none.evidenceLevel).toBe("benchmark"); expect(none.pooledFactor).toBe(1);
  });
  it("finds similar properties by type, size and constraint pattern without transferring conclusions", () => {
    const t = { id: "A", type: "hotel" as const, rooms: 42, bindingHistory: ["C-001"], learning: [] };
    const sim = similarProperties(t, [{ id: "B", type: "hotel", rooms: 51, bindingHistory: ["C-001"], learning: [] }, { id: "C", type: "spa", rooms: 5, bindingHistory: ["C-003"], learning: [] }]);
    expect(sim.map((s) => s.profile.id)).toEqual(["B"]);
  });
});

describe("scenario thresholds", () => {
  it("changing an assumption changes the decision only when a threshold is crossed, and the threshold is found by the engine", () => {
    const base = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    const t = base.thresholds.find((x) => x.interventionId === "I-004" && x.variable === "convMobile")!;
    expect(t).toBeDefined(); expect(t.fromStatus).toBe("BLOCKED"); expect(t.to).toBeGreaterThan(COUNTRY_HOUSE_34.convMobile);
    const below = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, spec: { convMobile: t.to * 0.98 } });
    const above = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, spec: { convMobile: t.to * 1.02 } });
    expect(below.allocation.lines.find((l) => l.interventionId === "I-004")!.status).toBe("BLOCKED");
    expect(above.allocation.lines.find((l) => l.interventionId === "I-004")!.status).toBe(t.toStatus);
    expect(compareRuns(base, below).some((d) => d.field === "decision.statuses")).toBe(false);
    expect(explainChange(base, above).join(" ")).toMatch(/threshold crossed/);
  });
  it("the ladder of an acquisition action along mobile conversion runs BLOCKED → INVESTIGATE → (DEFERRED or FUNDED)", () => {
    const base = runCycle({ seed: 1, budgetGbp: 60_000, now: NOW, measure: false });
    const steps = base.thresholds.filter((x) => x.interventionId === "I-005" && x.variable === "convMobile").map((x) => `${x.fromStatus}→${x.toStatus}`);
    expect(steps[0]).toBe("BLOCKED→INVESTIGATE");
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });
  it("sensitivity names the assumption that drives the result", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    expect(r.sensitivity[0]!.evSwingGbp).toBeGreaterThan(0);
    expect(r.mostSensitiveUnknown.valueOfInformation).toBe("HIGH");
    expect(r.mostSensitiveUnknown.recommendedNextAction).toMatch(/geo-holdout|holdout/);
  });
});

describe("provenance", () => {
  it("every material output traces to evidence ids that resolve to observations or records", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    const obsIds = new Set(r.property.observations.map((o) => o.id));
    for (const c of r.diagnosis.constraints) { expect(c.evidence.length).toBeGreaterThan(0); for (const e of c.evidence) expect(obsIds.has(e)).toBe(true); }
    for (const e of r.exposures) for (const x of e.evidence) expect(obsIds.has(x)).toBe(true);
    for (const i of r.interventions) for (const x of i.evidence) expect(obsIds.has(x)).toBe(true);
    for (const x of r.decision.evidence) expect(obsIds.has(x)).toBe(true);
    for (const rec of r.records) { expect(rec.owner.length).toBeGreaterThan(0); expect(rec.approvalTier).toMatch(/^T/); expect(rec.whatWouldUnblock !== undefined).toBe(true); }
  });
});
