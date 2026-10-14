/** SYNTHETIC fixtures only: the simulated 34-room property and a synthetic PMS snapshot. Nothing here is a real property. */
import { describe, it, expect } from "vitest";
import { runCycle, emptyContext, sha256Hex, observedChange, COUNTRY_HOUSE_34, type CycleResult } from "@anesis/engine";
const WEEKLY = Array.from({ length: 80 }, (_, i) => ({ weekStart: new Date(Date.parse("2025-01-06T00:00:00Z") + i * 7 * 86_400_000).toISOString().slice(0, 10), roomNights: 100, revenueGbp: 20_000 + (i >= 69 ? 1_500 : 0) }));   // SYNTHETIC: flat, +£1,500/week from week 69 (2026-05-04)
import { prepareInterventions, transition, originIntact, assessOutcome, closureDossier, deliverablesFor, budgetFromContract, type InterventionContract } from "../index.js";

const NOW = "2026-10-14T09:00:00Z";
const base = (): CycleResult => runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
const withPms = (): CycleResult => runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), systems: { pms: { asOf: "2026-10-01", periodDays: 365, rooms: 34, roomNightsSold: 8_600, roomRevenueGbp: 1_640_000, cancellations: 410, noShows: null, otaRoomNights: 4_100, otaCommissionGbp: null, peakOccupancy: null, bookingWindowDays: 21, channels: [], source: "SYNTHETIC test snapshot" } } } });
const find = (cs: InterventionContract[], id: string) => cs.find((c) => c.decisionPackageRef.interventionId === id)!;
const human = { by: "Cecilia (founder)", human: true, at: "2026-10-15T10:00:00Z" };

describe("decision-to-execution — contracts from a real cycle", () => {
  it("1. a funded intervention on verified data: contract cites VERIFIED sources, the binding constraint, the plan, and prepares the right deliverables", () => {
    const r = withPms(); const cs = prepareInterventions(r, "RUN-001", NOW); const c = find(cs, "I-001");
    expect(c.decisionStatus).toBe("FUNDED"); expect(c.state).toBe("PREPARED"); expect(c.constraint.isBinding).toBe(true);
    expect(c.evidence.verified.some((v) => /occupancy|adr|ota_share|room_revenue/.test(v))).toBe(true);
    expect(c.measurement.preregistration?.sha256).toMatch(/^[0-9a-f]{64}$/); expect(c.measurement.successRule).toBeTruthy(); expect(c.observationWindowWeeks).toBeGreaterThan(0);
    expect(c.deliverables.map((d) => d.kind)).toEqual(["TECHNICAL_TICKET", "BOOKING_JOURNEY_BRIEF", "MEASUREMENT_PLAN"]);
    expect(c.deliverables[0]!.body.join("\n")).toMatch(/Reproduction: NOT VERIFIED/);
    expect(c.deliverables.every((d) => /Not sent, not deployed, not launched/.test(d.notSentNote))).toBe(true);
    expect(c.approvedCost.status).toBe("UNKNOWN"); expect(c.estimatedBudget.status).toBe("ESTIMATE");
    expect(c.owner.head).toMatch(/Digital Experience/);
  });
  it("2. partial data: simulated sources are hypotheses, unmet requirements are unknowns, confidence states its limits", () => {
    const c = find(prepareInterventions(base(), "RUN-001", NOW), "I-001");
    expect(c.simulated).toBe(true); expect(c.evidence.hypotheses.some((h) => /simulated/.test(h))).toBe(true);
    expect(c.confidence.limits).toContain("cited data are simulated"); expect(c.baseline.status).toBe("HYPOTHESIS");
  });
  it("3. contradictory data (a verified occupancy that contradicts the simulated funnel): the contract keeps both classes apart and does not reconcile them silently", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), systems: { pms: { asOf: "2026-10-01", periodDays: 365, rooms: 34, roomNightsSold: 12_000, roomRevenueGbp: 900_000, cancellations: null, noShows: null, otaRoomNights: null, otaCommissionGbp: null, peakOccupancy: null, bookingWindowDays: null, channels: [], source: "SYNTHETIC contradictory snapshot" } } } });
    const cs = prepareInterventions(r, "RUN-001", NOW); const c = cs[0]!;
    expect(c.evidence.verified.length).toBeGreaterThan(0); expect(c.evidence.hypotheses.length).toBeGreaterThan(0);
    expect(c.sources.filter((s) => s.cls === "VERIFIED").every((s) => s.source === "CONN-PMS")).toBe(true);
    expect(c.sources.filter((s) => s.cls === "HYPOTHESIS").every((s) => /simulated/.test(s.note))).toBe(true);
  });
  it("4. no known budget: an UNKNOWN estimate stays UNKNOWN in the contract and in the brief", () => {
    const c = find(prepareInterventions(base(), "RUN-001", NOW), "I-001");
    const unknownBudget: InterventionContract = { ...c, estimatedBudget: { kind: "estimated_intervention_budget", amountGbp: null, status: "UNKNOWN", assumptions: ["no basis"], source: "none" } };
    const ds = deliverablesFor(unknownBudget);
    expect(ds[0]!.body.join("\n")).toMatch(/Estimated budget: UNKNOWN/); expect(ds[0]!.body.join("\n")).not.toMatch(/£0/);
  });
  it("5. authorisation needs a named human: the engine cannot authorise; a human can, and the approval is recorded with the budget", () => {
    const r = withPms(); const c0 = find(prepareInterventions(r, "RUN-001", NOW), "I-001"); const budget = r.records.find((x) => x.id === "I-001")!.budget;
    const s = transition(c0, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract;
    expect(() => transition(s, { to: "AUTHORISED", actor: { by: "engine", human: false, at: NOW }, budget })).toThrow(/requires a named human/);
    const a = transition(s, { to: "AUTHORISED", actor: human, budget, approvedAmountGbp: 7_500, note: "approved at £7,500" });
    expect(a.contract.state).toBe("AUTHORISED"); expect(a.contract.approvedCost.amountGbp).toBe(7_500); expect(a.contract.approvedCost.status).toBe("OBSERVED"); expect(a.budget?.status).toBe("AUTHORISED");
    expect(a.contract.history.at(-1)).toMatchObject({ by: "Cecilia (founder)", human: true, from: "SUBMITTED", to: "AUTHORISED" });
    expect(originIntact(a.contract, sha256Hex)).toBe(true);
  });
  it("6. forbidden transitions throw: PREPARED → IN_EXECUTION, CLOSED → anything, EXECUTED without evidence", () => {
    const r = withPms(); const c0 = find(prepareInterventions(r, "RUN-001", NOW), "I-001"); const budget = r.records.find((x) => x.id === "I-001")!.budget;
    expect(() => transition(c0, { to: "IN_EXECUTION", actor: human })).toThrow(/not allowed/);
    const s = transition(c0, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract;
    const a = transition(s, { to: "AUTHORISED", actor: human, budget }); const e = transition(a.contract, { to: "IN_EXECUTION", actor: human, budget: a.budget! });
    expect(() => transition(e.contract, { to: "EXECUTED", actor: human })).toThrow(/requires at least one proof/);
    expect(() => transition(e.contract, { to: "EXECUTED", actor: human, proofs: [{ kind: "deployment", reference: "   ", note: "" }] })).toThrow(/requires at least one proof/);
    const done = transition(e.contract, { to: "EXECUTED", actor: human, proofs: [{ kind: "deployment", reference: "deploy-2026-11-02", note: "booking journey release" }], budget: e.budget! });
    const closed = transition(done.contract, { to: "CLOSED", actor: human, budget: done.budget! });
    expect(() => transition(closed.contract, { to: "IN_EXECUTION", actor: human })).toThrow(/not allowed/);
    expect(closed.contract.version).toBe(6); expect(closed.contract.history).toHaveLength(6); expect(originIntact(closed.contract, sha256Hex)).toBe(true);
    expect(closureDossier(closed.contract).body.some((l) => /EXECUTED by Cecilia/.test(l))).toBe(true);
  });
  it("7. unmet prerequisites block authorisation", () => {
    const cs = prepareInterventions(base(), "RUN-001", NOW); const blocked = cs.find((c) => c.prerequisites.status === "UNRESOLVED") ?? { ...cs[0]!, prerequisites: { dependsOn: ["I-001"], status: "UNRESOLVED", unmet: ["I-001 must be executed first"] }, dataRequest: null };
    const s = transition(blocked, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract;
    expect(() => transition(s, { to: "AUTHORISED", actor: human })).toThrow(/prerequisites unmet/);
  });
  it("8. an intervention whose indicator cannot be measured says so: no success rule, no pre-registration, NOT_MEASURABLE", () => {
    const cs = prepareInterventions(base(), "RUN-001", NOW); const c = cs.find((x) => x.decisionStatus !== "FUNDED")!;
    expect(c.measurement.successRule).toBeNull(); expect(c.measurement.preregistration).toBeNull();
    const o = assessOutcome(c, { before: 0.0068, after: 0.009, unit: "ratio", measurement: null });
    expect(o.incrementality).toBe("NOT_MEASURABLE"); expect(o.observedChange).toBeCloseTo(0.0022, 4);
  });
  it("9. an observed improvement is not incrementality: without a counterfactual, or with an altered plan, or inconclusive", () => {
    const c = find(prepareInterventions(withPms(), "RUN-001", NOW), "I-001");
    expect(assessOutcome(c, { before: 0.0068, after: 0.0121, unit: "ratio", measurement: null }).incrementality).toBe("NOT_ESTABLISHED");
    expect(assessOutcome(c, { before: 0.0068, after: 0.0121, unit: "ratio", measurement: { status: "ESTABLISHED", planIntact: false, incrementalPointGbp: 50_000, placeboPassed: true } }).reason).toMatch(/altered/);
    expect(assessOutcome(c, { before: 0.0068, after: 0.0121, unit: "ratio", measurement: { status: "INCONCLUSIVE", planIntact: true, incrementalPointGbp: 10_000, placeboPassed: true } }).incrementality).toBe("NOT_ESTABLISHED");
    expect(assessOutcome(c, { before: 0.0068, after: 0.0121, unit: "ratio", measurement: { status: "ESTABLISHED", planIntact: true, incrementalPointGbp: 50_000, placeboPassed: true } }).incrementality).toBe("ESTABLISHED");
    expect(assessOutcome(c, { before: null, after: 0.0121, unit: "ratio", measurement: null }).observedNote).toMatch(/unknown/);
  });
  it("10. insufficient evidence produces a DATA_REQUEST, not a brief, and cannot be authorised", () => {
    const cs = prepareInterventions(base(), "RUN-001", NOW); const c = cs.find((x) => x.dataRequest)!;
    expect(c).toBeTruthy(); expect(c.deliverables.map((d) => d.kind)).toContain("DATA_REQUEST"); expect(c.deliverables.map((d) => d.kind)).not.toContain("ACQUISITION_BRIEF");
    expect(c.dataRequest!.missing.length).toBeGreaterThan(0); expect(c.dataRequest!.decisionItWouldInform).toMatch(/whether to fund/);
    const s = transition(c, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract;
    expect(() => transition(s, { to: "AUTHORISED", actor: human })).toThrow(/data request is open/);
  });
  it("11. reproducible: the same cycle prepares identical contracts and hashes", () => {
    const a = prepareInterventions(withPms(), "RUN-001", NOW), b = prepareInterventions(withPms(), "RUN-001", NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); expect(a.map((c) => c.originSha256)).toEqual(b.map((c) => c.originSha256));
  });
  it("an analytical intervention never gets an acquisition brief; a demand intervention gets one only when funded", () => {
    const cs = prepareInterventions(base(), "RUN-001", NOW);
    for (const c of cs) { const kinds = c.deliverables.map((d) => d.kind); if (c.decisionStatus !== "FUNDED") expect(kinds).not.toContain("ACQUISITION_BRIEF"); if (c.constraint.kind === "CONVERSION" && c.decisionStatus === "FUNDED") expect(kinds).not.toContain("ACQUISITION_BRIEF"); }
  });
});

/** C3 — budget governance: the contract is the budget authority; no path reaches execution without a human-authorised, known cost. */
describe("C3 — budget governance on the lifecycle", () => {
  const submitted = (c: InterventionContract) => transition(c, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract;
  const funded = () => { const r = withPms(); return { c: submitted(find(prepareInterventions(r, "RUN-001", NOW), "I-001")), budget: r.records.find((x) => x.id === "I-001")!.budget }; };
  it("the audit's bypass: AUTHORISED then IN_EXECUTION without any budget record is refused — the contract's own budget governs", () => {
    const { c } = funded();
    const a = transition(c, { to: "AUTHORISED", actor: human });                       // no budget record given: the contract's estimate supplies the amount
    expect(a.contract.budgetStatus).toBe("AUTHORISED"); expect(a.contract.approvedCost.status).toBe("OBSERVED"); expect(a.contract.approvedCost.amountGbp).toBe(c.estimatedBudget.amountGbp);
    const forged: InterventionContract = { ...a.contract, budgetStatus: "PROPOSED", approvedCost: c.approvedCost };   // a contract whose state says AUTHORISED but whose budget was never approved
    expect(() => transition(forged, { to: "IN_EXECUTION", actor: human })).toThrow(/execution needs an AUTHORISED budget \(is PROPOSED\)/);
    const e = transition(a.contract, { to: "IN_EXECUTION", actor: human });
    expect(e.contract.budgetStatus).toBe("IN_EXECUTION"); expect(e.budget.status).toBe("IN_EXECUTION");
  });
  it("UNKNOWN is not zero: an unknown estimate cannot be authorised without a stated amount; a stated amount is recorded as OBSERVED", () => {
    const { c } = funded();
    const noEstimate: InterventionContract = { ...c, estimatedBudget: { kind: "estimated_intervention_budget", amountGbp: null, status: "UNKNOWN", assumptions: ["no basis"], source: "none" } };
    expect(() => transition(noEstimate, { to: "AUTHORISED", actor: human })).toThrow(/UNKNOWN is not zero/);
    const a = transition(noEstimate, { to: "AUTHORISED", actor: human, approvedAmountGbp: 4_000 });
    expect(a.contract.approvedCost).toMatchObject({ amountGbp: 4_000, status: "OBSERVED" });
    expect(() => transition(noEstimate, { to: "AUTHORISED", actor: human, approvedAmountGbp: -1 })).toThrow(/finite, non-negative/);
    expect(() => transition(noEstimate, { to: "AUTHORISED", actor: human, approvedAmountGbp: Number.NaN })).toThrow(/finite, non-negative/);
  });
  it("a budget record handed over must be the contract's own and agree with it: another intervention's, or a diverging status, is refused", () => {
    const { c, budget } = funded();
    expect(() => transition(c, { to: "AUTHORISED", actor: human, budget: { ...budget, interventionId: "I-002" } })).toThrow(/belongs to I-002/);
    expect(() => transition(c, { to: "AUTHORISED", actor: human, budget: { ...budget, status: "AUTHORISED" } })).toThrow(/contract is the authority/);
    const a = transition(c, { to: "AUTHORISED", actor: human, budget });
    expect(() => transition(a.contract, { to: "IN_EXECUTION", actor: human, budget })).toThrow(/contract is the authority/);   // the stale PROPOSED record cannot be replayed
  });
  it("a rejected or closed budget cannot be authorised; the engine still cannot authorise; a withdrawn proposal rejects its budget", () => {
    const { c, budget } = funded();
    expect(() => transition({ ...c, budgetStatus: "REJECTED" }, { to: "AUTHORISED", actor: human })).toThrow(/only a PROPOSED or APPROVED budget/);
    expect(() => transition(c, { to: "AUTHORISED", actor: { by: "engine", human: false, at: NOW }, budget })).toThrow(/requires a named human/);
    expect(() => transition(c, { to: "AUTHORISED", actor: { by: "", human: true, at: NOW } })).toThrow(/must name the person/);
    const w = transition(c, { to: "WITHDRAWN", actor: { by: "engine", human: false, at: NOW }, note: "superseded" });
    expect(w.contract.budgetStatus).toBe("REJECTED"); expect(w.contract.approvedCost.status).toBe("UNKNOWN");
  });
  it("an intervention included in the partnership still needs an explicit authorisation before execution", () => {
    const { c } = funded();
    const included: InterventionContract = { ...c, funding: { source: "included_in_partnership", note: "test" } };
    expect(() => transition({ ...included, state: "AUTHORISED" } as InterventionContract, { to: "IN_EXECUTION", actor: human })).toThrow(/execution needs an AUTHORISED budget/);
    expect(budgetFromContract(included).fundingSource).toBe("included_in_partnership");
  });
  it("the full governed path keeps budget and contract in step and the origin intact; approved cost is never null past AUTHORISED", () => {
    const { c } = funded();
    const a = transition(c, { to: "AUTHORISED", actor: human, approvedAmountGbp: 7_500 });
    const e = transition(a.contract, { to: "IN_EXECUTION", actor: human });
    const x = transition(e.contract, { to: "EXECUTED", actor: human, proofs: [{ kind: "ticket", reference: "DEV-412", note: "" }], actualSpendGbp: 6_900 });
    const m = transition(x.contract, { to: "MEASURED", actor: human, observed: observedChange({ weekly: WEEKLY, executedAt: "2026-05-04", windowWeeks: 4 }, "2026-06-10T00:00:00Z") });
    const z = transition(m.contract, { to: "CLOSED", actor: human });
    expect([a, e, x, m, z].map((s) => s.contract.budgetStatus)).toEqual(["AUTHORISED", "IN_EXECUTION", "IN_EXECUTION", "IN_EXECUTION", "CLOSED"]);
    expect([a, e, x, m, z].every((s) => s.contract.approvedCost.amountGbp === 7_500 && s.contract.approvedCost.status === "OBSERVED")).toBe(true);
    expect(originIntact(z.contract, sha256Hex)).toBe(true); expect(z.contract.version).toBe(7);
  });
});

/** F — proof, cost and observed result on the contract. */
describe("F — execution proof, actual cost, observed result", () => {
  const authorised = () => { const r = withPms(); const c0 = find(prepareInterventions(r, "RUN-001", NOW), "I-001"); const s = transition(c0, { to: "SUBMITTED", actor: { by: "engine", human: false, at: NOW } }).contract; const a = transition(s, { to: "AUTHORISED", actor: human, approvedAmountGbp: 7_500 }); return transition(a.contract, { to: "IN_EXECUTION", actor: human }).contract; };
  it("EXECUTED records structured proofs with who and when, and the actual spend as OBSERVED when reported, UNKNOWN (never zero) when not", () => {
    const e = authorised();
    const x = transition(e, { to: "EXECUTED", actor: human, proofs: [{ kind: "invoice", reference: "INV-2026-118", note: "developer" }, { kind: "deployment", reference: "https://example.test/deploys/77", note: "" }] });
    expect(x.contract.execution.proofs).toHaveLength(2); expect(x.contract.execution.proofs[0]).toMatchObject({ kind: "invoice", reference: "INV-2026-118", by: "Cecilia (founder)", recordedAt: human.at });
    expect(x.contract.execution.actualSpend).toMatchObject({ status: "UNKNOWN", amountGbp: null }); expect(x.contract.execution.executedAt).toBe(human.at);
    expect(x.contract.history.at(-1)!.evidence).toEqual(["invoice:INV-2026-118", "deployment:https://example.test/deploys/77"]);
    const y = transition(e, { to: "EXECUTED", actor: human, proofs: [{ kind: "ticket", reference: "T-1", note: "" }], actualSpendGbp: 6_200 });
    expect(y.contract.execution.actualSpend).toMatchObject({ status: "OBSERVED", amountGbp: 6_200 }); expect(originIntact(y.contract, sha256Hex)).toBe(true);
    expect(() => transition(e, { to: "EXECUTED", actor: human, proofs: [{ kind: "ticket", reference: "T-1", note: "" }], actualSpendGbp: -5 })).toThrow(/finite, non-negative/);
  });
  it("MEASURED needs an observed-change record and never a claim of incrementality; the closure dossier shows cost, proofs and the result", () => {
    const x = transition(authorised(), { to: "EXECUTED", actor: human, proofs: [{ kind: "ticket", reference: "T-2", note: "" }], actualSpendGbp: 7_000 }).contract;
    expect(() => transition(x, { to: "MEASURED", actor: human })).toThrow(/requires an observed-change record/);
    const obs = observedChange({ weekly: WEEKLY, executedAt: "2026-05-04", windowWeeks: 4 }, "2026-06-10T00:00:00Z");
    expect(() => transition(x, { to: "MEASURED", actor: human, observed: { ...obs, incrementality: "ESTABLISHED" as never } })).toThrow(/cannot claim incrementality/);
    const m = transition(x, { to: "MEASURED", actor: human, observed: obs }); expect(m.contract.execution.measured?.observedChange).toBeCloseTo(1_500, 0);
    const z = transition(m.contract, { to: "CLOSED", actor: human }); const d = closureDossier(z.contract).body.join("\n");
    expect(d).toMatch(/Approved cost: £7,500 \(OBSERVED\); actual spend: £7,000 \(OBSERVED\)/); expect(d).toMatch(/Proofs: ticket T-2/); expect(d).toMatch(/change 1500 \(seasonally adjusted\); incrementality NOT_ESTABLISHED/);
  });
});
