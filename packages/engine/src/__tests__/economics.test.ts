import { describe, it, expect } from "vitest";
import { runCycle, emptyContext, fundingSource, transitionBudget, interventionBudget, HEAD_TITLE, type PartnershipTerms } from "../index.js";

const NOW = "2026-09-25T00:00:00Z";
const termsB: PartnershipTerms = { monthlyFeeGbp: 5_000, fundingModel: "partnership_plus_intervention_budget", includedCapabilities: [], hybridIncludedLimitGbp: null, source: "contract (test)" };

describe("commercial model — three economic layers", () => {
  it("§15 scenario: mobile conversion is the constraint; the client receives a decision package, not a supplier invoice", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), partnership: termsB, providers: [{ id: "PV-ABC", name: "ABC Digital", role: "web_developer", scope: "booking engine", factors: ["conversion"], systems: [] }] } });
    const rec = r.records.find((x) => x.id === "I-001")!; const p = rec.package;
    expect(r.diagnosis.binding).toBe("C-001");
    expect(p.commercialConstraint).toMatch(/Mobile booking conversion/);
    expect(p.decision).toMatch(/^Prioritise/);
    expect(p.estimatedInterventionBudget.kind).toBe("estimated_intervention_budget"); expect(p.estimatedInterventionBudget.status).toBe("ESTIMATE"); expect(p.estimatedInterventionBudget.amountGbp).toBe(8_000);
    expect(p.partnership).toBe("Separate");
    expect(p.fundingModel).toMatch(/Model B/); expect(p.fundingModel).toMatch(/budgeted separately/);
    expect(p.responsibleAnesisFunction).toBe(HEAD_TITLE.digital_experience_booking);
    expect(p.requiredCapabilities).toEqual(["ux", "cro", "development", "booking_engine"]);
    expect(p.executionResources).toEqual(["ABC Digital (web_developer)"]);
    expect(p.clientRole).toMatch(/Approve intervention/); expect(p.anesisRole).toMatch(/not the project manager/);
    expect(p.execution).toMatch(/Mobilised by the responsible Head after approval/);
    expect(p.measurement).toMatch(/Anesis controlled measurement framework/); expect(p.learning).toMatch(/Anesis Memory/);
    expect(p.budgetStatus).toBe("PROPOSED"); expect(p.approval).toMatch(/REQUIRED — governance level L3/);
    expect(r.events.find((e) => e.type === "ACTION_PROPOSED")!.detail).toMatch(/not an authorised spend/);
    expect(r.events.some((e) => e.type === "ACTION_FUNDED")).toBe(false);
  });
  it("money kinds stay distinct and unknown when no real data exists", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    const b = r.records.find((x) => x.id === "I-001")!.budget;
    expect(b.estimated.status).toBe("ESTIMATE"); expect(b.approved.status).toBe("UNKNOWN"); expect(b.actualSpend.status).toBe("UNKNOWN"); expect(b.providerCost.status).toBe("UNKNOWN"); expect(b.anesisRevenue.status).toBe("UNKNOWN");
    expect(b.partnershipSeparate).toBe(true); expect(b.fundingSource).toBe("requires_contract_determination");
    expect(r.records.find((x) => x.id === "I-001")!.package.fundingModel).toBe("Requires contract determination");
  });
  it("the funding model is never assumed: A includes, B bills separately, C depends on the limit, D is client-funded with Anesis responsible", () => {
    const caps = ["ux", "cro"] as const;
    expect(fundingSource({ ...termsB, fundingModel: "managed_partnership", includedCapabilities: ["ux", "cro"] }, caps, 12_000).source).toBe("included_in_partnership");
    expect(fundingSource({ ...termsB, fundingModel: "managed_partnership", includedCapabilities: ["ux"] }, caps, 12_000).source).toBe("partly_included_partly_separate");
    expect(fundingSource(termsB, caps, 12_000).source).toBe("separate_intervention_budget");
    expect(fundingSource({ ...termsB, fundingModel: "hybrid", hybridIncludedLimitGbp: 15_000 }, caps, 12_000).source).toBe("included_in_partnership");
    expect(fundingSource({ ...termsB, fundingModel: "hybrid", hybridIncludedLimitGbp: 10_000 }, caps, 12_000).source).toBe("separate_intervention_budget");
    const d = fundingSource({ ...termsB, fundingModel: "client_funded_execution" }, caps, 12_000); expect(d.source).toBe("client_funded"); expect(d.note).toMatch(/Anesis remains responsible/);
    expect(fundingSource({ ...termsB, fundingModel: null }, caps, null).source).toBe("requires_contract_determination");
  });
  it("a recommendation is never an authorised spend: the engine cannot approve; a human moves PROPOSED → APPROVED → AUTHORISED", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    const i = r.interventions.find((x) => x.id === "I-001")!;
    const b = interventionBudget(i, "FUNDED", termsB, 3);
    expect(b.status).toBe("PROPOSED");
    expect(() => transitionBudget(b, "APPROVED", { human: false })).toThrow(/requires a human decision/);
    expect(() => transitionBudget(b, "AUTHORISED", { human: true })).toThrow(/not allowed/);
    const approved = transitionBudget(b, "APPROVED", { human: true, amountGbp: 12_000 });
    expect(approved.approved.status).toBe("OBSERVED"); expect(approved.approved.amountGbp).toBe(12_000); expect(approved.estimated.amountGbp).toBe(8_000); // estimate and approval are different lines
    expect(transitionBudget(approved, "AUTHORISED", { human: true }).status).toBe("AUTHORISED");
  });
  it("the five Heads own their domains; providers are execution resources orchestrated by Anesis, not by the client", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), providers: [{ id: "PV-ABC", name: "ABC Digital", role: "web_developer", scope: "", factors: ["conversion"], systems: [] }] } });
    expect(r.records.find((x) => x.id === "I-004")!.owner).toBe(HEAD_TITLE.brand_acquisition);
    expect(r.records.find((x) => x.id === "I-003")!.owner).toBe(HEAD_TITLE.guest_lifecycle_experience);
    expect(r.records.find((x) => x.id === "I-002")!.owner).toBe(HEAD_TITLE.revenue_conversion_economics);
    expect(r.providerBriefs.find((b) => b.interventionId === "I-001")!.orchestration).toMatch(/not the project manager/);
  });
});
