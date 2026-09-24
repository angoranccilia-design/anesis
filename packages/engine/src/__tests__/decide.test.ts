import { describe, it, expect } from "vitest";
import { runCycle } from "../cycle.js";
import { evpi, valueOfInformation } from "../voi.js";
import type { Intervention } from "../model.js";

const base = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false });

describe("value of information", () => {
  const mk = (o: Partial<Intervention>): Intervention => ({
    id: "X", name: "x", actsOn: "conversion", addresses: [], costGbp: 10_000, effectIfWorksGbp: { low: 5_000, high: 30_000 }, confidence: 0.5,
    confidenceBasis: "test", risk: "Low", reversibility: "High", timeToImpactWeeks: 1, mustFollow: [], informationOption: null, evidence: [], calibration: null, ...o });
  it("EVPI is non-negative and zero when the decision cannot change", () => {
    expect(evpi(mk({}))).toBeGreaterThanOrEqual(0);
    expect(evpi(mk({ effectIfWorksGbp: { low: 1_000, high: 2_000 } }))).toBe(0); // never worth acting, information cannot help
  });
  it("recommends collecting information when a cheap, good study resolves an uncertain, costly decision", () => {
    const v = valueOfInformation(mk({ informationOption: { name: "study", costGbp: 200, quality: 0.9 } }));
    expect(v.decision).toBe("COLLECT_MORE_INFORMATION");
    expect(v.evsiGbp).toBeGreaterThan(200);
  });
  it("says DO_NOT_ACT when expected value is negative and information is not worth its cost", () => {
    const v = valueOfInformation(mk({ confidence: 0.1, informationOption: { name: "study", costGbp: 5_000, quality: 0.5 } }));
    expect(v.decision).toBe("DO_NOT_ACT");
  });
});

describe("allocation and decision", () => {
  it("blocks paid acquisition while conversion binds, with reason and required condition", () => {
    const line = base.allocation.lines.find((l) => l.interventionId === "I-004")!;
    expect(line.funded).toBe(false);
    expect(line.blockedBy.join(" ")).toMatch(/consumed by conversion/);
    expect(line.requiredCondition).toMatch(/conv\.mobile/);
    expect(base.voi.find((v) => v.interventionId === "I-004")!.expectedValueGbp).toBeGreaterThan(0); // attractive on paper, still blocked
  });
  it("funds the conversion fix and the reactivation programme within budget and keeps the reserve", () => {
    expect(base.decision.selected).toEqual(expect.arrayContaining(["I-001", "I-003"]));
    expect(base.allocation.allocatedGbp).toBeLessThanOrEqual(base.allocation.budgetGbp - base.allocation.reserveGbp);
    expect(base.allocation.reserveGbp).toBe(1_600);
  });
  it("unblocks paid acquisition once conversion is at benchmark (the rule, not a hard-coded conclusion)", () => {
    const fixed = runCycle({ seed: 1, budgetGbp: 40_000, now: "2026-01-01T00:00:00Z", measure: false, spec: { convMobile: 0.013 } });
    const line = fixed.allocation.lines.find((l) => l.interventionId === "I-004")!;
    expect(line.blockedBy.join(" ")).not.toMatch(/consumed by conversion/);
    expect(fixed.diagnosis.binding).not.toBe("C-001");
  });
  it("records rejected alternatives with reasons and states what would change the decision", () => {
    expect(base.decision.rejected.map((r) => r.id)).toEqual(expect.arrayContaining(["I-004", "I-002"]));
    for (const r of base.decision.rejected) expect(r.reasons.length).toBeGreaterThan(0);
    expect(base.decision.wouldChangeIf.some((c) => c.metric === "conv.mobile")).toBe(true);
    expect(base.decision.governance.level).toBeLessThanOrEqual(2);
  });
  it("declines the Assay for a well-run property whose owner already has the right plan", () => {
    const well = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false,
      spec: { convMobile: 0.0150, convDesktop: 0.026, otaShare: 0.30, repeatRate: 0.21, lowSeasonOcc: 0.5, ownerPlan: "I-003" } });
    expect(well.assay.verdict).not.toBe("PROCEED");
    expect(well.assay.valueOfDiagnosisGbp).toBeLessThan(3 * well.assay.thesisPriceGbp);
  });
  it("funds nothing and emits NOTHING_FUNDED when the budget cannot cover any intervention", () => {
    const poor = runCycle({ seed: 1, budgetGbp: 2_000, now: "2026-01-01T00:00:00Z" });
    expect(poor.decision.selected).toEqual([]);
    expect(poor.plan).toBeNull();
    expect(poor.events.some((e) => e.type === "NOTHING_FUNDED")).toBe(true);
    expect(poor.decision.governance.level).toBe(0);
  });
});
