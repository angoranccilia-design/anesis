/** Chantier B — under verified_only nothing simulated or undocumented reaches a conclusion. SYNTHETIC snapshots only. */
import { describe, it, expect } from "vitest";
import { runCycle, emptyContext, specFromSnapshots, COUNTRY_HOUSE_34, type PmsSnapshot, type BenchSources } from "../index.js";

const T = "2026-10-14T09:00:00Z";
const weekly = Array.from({ length: 60 }, (_, i) => ({ weekStart: new Date(Date.parse("2025-08-04T00:00:00Z") + i * 7 * 86_400_000).toISOString().slice(0, 10), roomNights: 120 + (i % 10) * 4, revenueGbp: 21_000 + (i % 13) * 900 }));
const pms: PmsSnapshot = { asOf: "2026-09-30", periodDays: 365, rooms: 30, roomNightsSold: 6_900, roomRevenueGbp: 1_173_000, cancellations: 300, noShows: 20, otaRoomNights: 3_600, otaCommissionGbp: 95_000, peakOccupancy: 0.92, bookingWindowDays: 18, channels: [], source: "SYNTHETIC full-year snapshot", weekly, avgStayNights: 2.1 };
const documented: BenchSources = { "ota_share.target": { source: "SYNTHETIC test source", asOf: "2026-01-01" }, "ota.shiftable.low": { source: "SYNTHETIC", asOf: "2026-01-01" }, "ota.shiftable.high": { source: "SYNTHETIC", asOf: "2026-01-01" } };
const ctxWith = (p: PmsSnapshot | undefined) => ({ ...emptyContext(T), systems: p ? { pms: p } : {} });

describe("B — verified_only", () => {
  it("no system at all: no constraint assessable, no binding constraint, totals withheld, every intervention blocked for insufficient evidence, nothing funded, no plan", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: T, evidencePolicy: "verified_only", context: ctxWith(undefined) });
    expect(r.diagnosis.evidencePolicy).toBe("verified_only"); expect(r.diagnosis.binding).toBeNull(); expect(r.diagnosis.notAssessable.length).toBe(r.diagnosis.constraints.length);
    expect(r.diagnosis.actualGbp).toBe(0); expect(r.diagnosis.attainableGbp).toBe(0); expect(r.diagnosis.bindingWhy).toMatch(/no constraint is assessable on verified data/);
    expect(r.allocation.lines.every((l) => l.status === "BLOCKED" && /INSUFFICIENT EVIDENCE/.test(l.blockedBy[0] ?? ""))).toBe(true);
    expect(r.decision.selected).toEqual([]); expect(r.plan).toBeNull(); expect(r.measurement).toBeNull(); expect(r.seriesSource).toBe("simulated");
    expect(r.events.some((e) => e.type === "EVIDENCE_WITHHELD")).toBe(true);
    expect(r.interventions.every((i) => i.effectIfWorksGbp.high === 0)).toBe(true);   // no fictitious effect is shown
  });
  it("a full-year PMS snapshot with documented OTA benchmarks: the spec comes from the data, C-002 is assessable and binding, conversion/retention/demand stay withheld, the weekly history is the PMS one", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: T, evidencePolicy: "verified_only", context: ctxWith(pms), benchmarkSources: documented });
    expect(r.property.spec.rooms).toBe(30); expect(r.property.spec.adrGbp).toBeCloseTo(170, 0); expect(r.property.spec.occupancy).toBeCloseTo(6_900 / (30 * 365), 4); expect(r.property.spec.otaShare).toBeCloseTo(3_600 / 6_900, 4);
    const c2 = r.diagnosis.constraints.find((c) => c.id === "C-002")!; expect(c2.assessable).toBe(true); expect(c2.gapGbp.high).toBeGreaterThan(0);
    for (const id of ["C-001", "C-003", "C-004"]) { const c = r.diagnosis.constraints.find((x) => x.id === id)!; expect(c.assessable).toBe(false); expect(c.gapGbp).toEqual({ low: 0, high: 0 }); expect(c.missing.length).toBeGreaterThan(0); }
    expect(r.diagnosis.binding).toBe("C-002"); expect(r.diagnosis.actualGbp).toBe(1_173_000);
    expect(r.seriesSource).toBe("pms_weekly"); expect(r.property.series.comparables).toEqual([]); expect(r.attribution.verdict).toBe("not_assessable");
    const i2 = r.allocation.lines.find((l) => l.interventionId === "I-002")!; expect(["FUNDED", "BLOCKED", "INVESTIGATE", "REJECTED", "DEFERRED"]).toContain(i2.status);
    const i1 = r.allocation.lines.find((l) => l.interventionId === "I-001")!; expect(i1.status).toBe("BLOCKED"); expect(i1.blockedBy[0]).toMatch(/C-001 is not assessable/);
    const i4 = r.allocation.lines.find((l) => l.interventionId === "I-004")!; expect(i4.status).toBe("BLOCKED"); expect(i4.blockedBy.join(" ")).toMatch(/not assessable/);
    expect(r.property.observations.find((o) => o.metric === "booking_value_avg")).toMatchObject({ status: "MODELLED", source: "CONN-PMS" });
  });
  it("the same snapshot without documented benchmarks: C-002 is withheld too, naming the undocumented keys", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: T, evidencePolicy: "verified_only", context: ctxWith(pms) });
    const c2 = r.diagnosis.constraints.find((c) => c.id === "C-002")!; expect(c2.assessable).toBe(false); expect(c2.missing).toEqual(expect.arrayContaining(["benchmark ota_share.target (no documented source)"]));
    expect(r.diagnosis.binding).toBeNull();
  });
  it("simulated_allowed is unchanged: everything assessable, simulated series, measurement simulated", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: T, context: ctxWith(pms) });
    expect(r.diagnosis.constraints.every((c) => c.assessable)).toBe(true); expect(r.seriesSource).toBe("simulated"); expect(r.measurement).not.toBeNull();
  });
  it("specFromSnapshots never invents: an absent field keeps the declared value", () => {
    const s = specFromSnapshots(COUNTRY_HOUSE_34, { pms: { ...pms, roomRevenueGbp: null, otaRoomNights: null, otaCommissionGbp: null, peakOccupancy: null } });
    expect(s.rooms).toBe(30); expect(s.adrGbp).toBe(COUNTRY_HOUSE_34.adrGbp); expect(s.otaShare).toBe(COUNTRY_HOUSE_34.otaShare); expect(s.sessionsPerYear).toBe(COUNTRY_HOUSE_34.sessionsPerYear);
  });
});
