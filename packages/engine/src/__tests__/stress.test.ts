/** The founder's stress tests (§9, §10) as the definition of done. Two unseen properties, conflicting signals. */
import { describe, it, expect } from "vitest";
import { runCycle, emptyContext, quality, defaultGraph, assessCapacity, type ExternalContext, type PropertySpec } from "../index.js";

const NOW = "2026-09-25T00:00:00Z"; const day = (i: number) => new Date(Date.parse(NOW) + i * 86400e3).toISOString().slice(0, 10);
const spec: Partial<PropertySpec> = { id: "PROP-ADV-001", name: "Thornwater Spa Hotel (fictional)", type: "hotel", rooms: 46, adrGbp: 168, occupancy: 0.64, otaShare: 0.58, otaCommission: 0.20, sessionsPerYear: 160_000, mobileShare: 0.66, convDesktop: 0.019, convMobile: 0.0055, pastGuests: 12_000, repeatRate: 0.06, reviewScore: 4.5, lowSeasonWeeks: 16, lowSeasonOcc: 0.41, metaSpendGbp: 30_000, googleSpendGbp: 12_000, ownerPlan: "I-004", location: { name: "Lake District (fictional)", lat: 54.46, lon: -3.09, country: "GB" }, peakOccupancy: 0.80, staffingCoverage: 0.9, weekendShare: 0.6, roomsOutOfOrder: 0 };
const base: ExternalContext = { ...emptyContext(NOW),
  sourceQuality: { "SRC-SIM-CRM": quality(0.7, 0.9, 24 * 45, "DAILY", "CRM export 45 days old") },
  weather: { location: { name: "Lake District", lat: 54.46, lon: -3.09 }, issuedAt: NOW, provider: "scenario", modelNote: "", days: Array.from({ length: 14 }, (_, i) => ({ date: day(i), precipitationMm: 0, tMaxC: 26, tMinC: 14, windMaxKmh: 10, sunshineHours: 12 })) },
  events: [{ id: "EV-1", name: "Kendal Mountain Festival (fictional dates)", start: day(10), end: day(12), expectedAttendance: 25_000, distanceKm: 15, venue: "Kendal", category: "festival", source: "operator", enteredBy: "operator", evidenceNote: "organiser's published attendance last year" }],
  search: [{ term: "lake district spa hotel", geography: "GB", kind: "destination", source: "simulation", weekly: Array.from({ length: 16 }, (_, i) => ({ week: `2026-W${24 + i}`, index: i < 8 ? 50 : 70 })) }],
  ota: { asOf: day(-2) + "T00:00:00Z", channels: [{ name: "Booking.com", share: 0.41, commission: 0.2, rankingPosition: 6, cancellationRate: 0.22, bookingWindowDays: 11 }], shareTrend12m: 0.06, source: "operator" },
  systems: { ads: [{ asOf: day(-1) + "T00:00:00Z", periodDays: 30, channel: "meta", spendGbp: 2500, impressions: 400000, clicks: 9000, attributedBookings: 60, attributedRevenueGbp: 10500, attributionModel: "platform_last_click", source: "operator" }], analytics: { asOf: day(-1) + "T00:00:00Z", periodDays: 30, sessions: 16000, sessionsPrior: 10800, mobileShare: 0.66, pageSpeedMobileMs: 4600, source: "operator" } },
  providers: [{ id: "PV-ABC", name: "ABC Digital", role: "web_developer", scope: "booking engine", factors: ["conversion"], systems: ["CONN-BOOKING-ENGINE"] }, { id: "PV-META", name: "Northern Social", role: "meta_agency", scope: "paid social", factors: ["demand"], systems: ["CONN-META-ADS"] }],
};
const competitors = (date: string) => [1, 2, 3, 4, 5].map((k) => ({ competitorId: `CP-${k}`, name: `Comparable ${k}`, observedAt: day(-1) + "T09:00:00Z", date, rateGbp: Math.round(168 * (1.10 + k * 0.0125)), available: false, reviewScore: 4.3, reviewCount30d: 12, source: "operator", enteredBy: "operator" as const }));
const spaGraph = defaultGraph({ propertyId: "PROP-ADV-001", rooms: 46, roomsOutOfOrder: 0, peakOccupancy: 0.80, staffingCoverage: 0.9, nowIso: NOW, source: "operator", spa: { slotsPerDay: 60, slotsSold: 58, therapistsPlanned: 8, therapistsAvailable: 6.56, treatmentRooms: 6, openingHours: 84 } });
const status = (r: ReturnType<typeof runCycle>, id: string) => r.allocation.lines.find((l) => l.interventionId === id)?.status;

describe("stress test 1 — unseen hotel with conflicting signals (replay)", () => {
  const r = runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: base, measure: false });
  it("keeps conversion as the limiting constraint and blocks acquisition; weather and event say NO MATERIAL DECISION IMPACT", () => {
    expect(r.diagnosis.binding).toBe("C-001");
    expect(status(r, "I-004")).toBe("BLOCKED"); expect(status(r, "I-001")).toBe("FUNDED");
    expect(r.fused.find((f) => f.scope === "weather")!.verdict).toBe("NO_DECISION_IMPACT");
    expect(r.fused.find((f) => f.scope === "events")!.verdict).toBe("NO_DECISION_IMPACT");
  });
  it("reconciles the systems: ROAS and traffic do not establish acquisition as limiting; platform attribution is flagged", () => {
    expect(r.reconciliation.statement).toMatch(/do not constitute evidence that acquisition is the current limiting constraint/);
    expect(r.reconciliation.conflicts.join(" ")).toMatch(/platform-attributed/);
    expect(r.reconciliation.highestUnresolved!.id).toBe("C-001");
  });
  it("knows what data is missing before deciding on acquisition, and treats a stale CRM as refreshable, not as evidence", () => {
    expect(r.requirements.find((q) => q.interventionId === "I-004")!.missingCritical).toEqual(expect.arrayContaining(["attribution confidence", "contribution margin"]));
    expect(status(r, "I-003")).toBe("INVESTIGATE"); expect(r.allocation.lines.find((l) => l.interventionId === "I-003")!.blockedBy[0]).toMatch(/INSUFFICIENT EVIDENCE/);
  });
  it("bounds sensitivity to plausible ranges and answers 'what would change my mind' with a threshold inside the range", () => {
    const d = r.decisionSensitivity;
    expect(d.mostSensitiveVariable).toBe("Mobile booking conversion");
    expect(d.decisionThreshold).toMatch(/I-00[45]: BLOCKED → INVESTIGATE/);
    const conv = r.plausibleRanges.find((p) => p.key === "convMobile")!; expect(conv.min).toBeGreaterThan(0.002); expect(conv.max).toBeLessThan(0.02);
    const t = r.thresholds.find((x) => x.variable === "convMobile" && x.interventionId === "I-005")!; expect(t.to).toBeGreaterThanOrEqual(conv.min); expect(t.to).toBeLessThanOrEqual(conv.max);
    expect(r.plausibleRanges.find((p) => p.key === "peakOccupancy")!.max).toBeLessThanOrEqual(1);
  });
  it("assigns the funded conversion intervention to the external developer with the acquisition-unblocking threshold as success criterion; Anesis keeps the commercial logic", () => {
    const b = r.providerBriefs.find((x) => x.interventionId === "I-001")!;
    expect(b.providerName).toBe("ABC Digital"); expect(b.instruction).toBe("PROCEED"); expect(b.successThreshold).toMatch(/mobile booking conversion ≥ /); expect(b.measurement).toMatch(/provider's own attribution is not the measure/);
    expect(r.providerBriefs.find((x) => x.interventionId === "I-004")!.instruction).toBe("DO_NOT_START");
  });
});

describe("stress test 1 — added signals", () => {
  it("spa at 97 % with therapists at 82 %: the capacity network finds the therapist bottleneck (nominal ≠ attainable) and reports it outside the room chain of a hotel", () => {
    const r = runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: { ...base, capacity: spaGraph }, measure: false });
    const spa = r.capacity.find((n) => n.activity === "spa")!;
    expect(spa.bottleneck!.resource).toMatch(/therapists/); expect(spa.attainableRatio).toBeCloseTo(0.82, 2); expect(spa.utilisationOfAttainable).toBeGreaterThan(1); expect(spa.binds).toBe(true);
    const c = r.diagnosis.constraints.find((x) => x.name.startsWith("Service capacity — Spa"))!;
    expect(c.kind).toBe("CAPACITY"); expect(c.attainment).toBe(0); expect(c.name).toMatch(/outside the room-booking chain/);
    expect(r.diagnosis.binding).toBe("C-001"); expect(status(r, "I-001")).toBe("FUNDED"); // a hotel's rooms funnel is not blocked by its spa
  });
  it("competitors +10–15 % ADR and <10 % available, event in 10 days, search +40 %, inventory retained: forward exposure, INVESTIGATE, not yet pricing or acquisition", () => {
    const r = runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: { ...base, capacity: spaGraph, competitors: competitors(day(10)) }, measure: false });
    expect(r.compression.detected).toBe(true); expect(r.compression.decision).toBe("INVESTIGATE"); expect(r.compression.notYet).toEqual(["INCREASE PRICING", "INCREASE ACQUISITION"]);
    expect(["MEDIUM", "HIGH"]).toContain(r.compression.confidenceLabel);
    expect(r.compression.observed.join(" ")).toMatch(/ADR is \+1\d %/); expect(r.compression.inferred).toMatch(/This is an inference, not an observed outcome/);
    expect(r.fused.find((f) => f.scope === "competitor")!.verdict).not.toBe("NO_DECISION_IMPACT");
    expect(status(r, "I-004")).toBe("BLOCKED"); // exposure never turns into acquisition
  });
  it("an economically implausible perturbation is not chosen: ADR stays inside its historical/market range", () => {
    const r = runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: { ...base, competitors: competitors(day(10)) }, measure: false });
    const adr = r.sensitivity.find((x) => x.variable === "adrGbp")!;
    expect(adr.high).toBeLessThanOrEqual(210); expect(adr.low).toBeGreaterThanOrEqual(120);
    expect(r.decisionSensitivity.mostSensitiveVariable).not.toBe("ADR");
  });
});

describe("stress test 2 — boutique spa resort: the same signals mean something different", () => {
  const spec2: Partial<PropertySpec> = { id: "PROP-BTQ-001", name: "Fellside Boutique Spa Resort (fictional)", type: "spa", rooms: 18, adrGbp: 395, occupancy: 0.58, otaShare: 0.30, otaCommission: 0.18, sessionsPerYear: 70_000, mobileShare: 0.6, convDesktop: 0.026, convMobile: 0.0125, pastGuests: 6_500, repeatRate: 0.24, reviewScore: 4.8, lowSeasonWeeks: 14, lowSeasonOcc: 0.36, metaSpendGbp: 9_000, googleSpendGbp: 9_000, ownerPlan: null, location: { name: "Lake District (fictional)", lat: 54.4, lon: -3.0, country: "GB" }, peakOccupancy: 0.93, staffingCoverage: 0.95, weekendShare: 0.7, roomsOutOfOrder: 0 };
  const graph2 = defaultGraph({ propertyId: "PROP-BTQ-001", rooms: 18, roomsOutOfOrder: 0, peakOccupancy: 0.93, staffingCoverage: 0.95, nowIso: NOW, source: "operator", spa: { slotsPerDay: 12, slotsSold: 12, therapistsPlanned: 8, therapistsAvailable: 7, treatmentRooms: 6, openingHours: 70 }, restaurant: { covers: 40, coversSold: 22, kitchenCapacity: 40, serviceStaffPlanned: 6, serviceStaffAvailable: 6 } });
  const r = runCycle({ seed: 7, budgetGbp: 30_000, now: NOW, spec: spec2, context: { ...emptyContext(NOW), weather: base.weather, events: base.events, search: base.search, competitors: competitors(day(10)), capacity: graph2, providers: base.providers }, measure: false });
  it("capacity binds (spa in the chain for a spa property; rooms saturated at peak), acquisition is blocked with the collision explanation, and the off-peak programme emerges", () => {
    expect(r.diagnosis.constraints.find((c) => c.name.startsWith("Service capacity — Spa"))!.factor).toBe("service_capacity");
    expect(["C-005", "C-007"]).toContain(r.diagnosis.binding);
    expect(r.allocation.lines.find((l) => l.interventionId === "I-005")!.blockedBy[0]).toMatch(/collide with an operational capacity constraint/);
    expect(r.diagnosis.bindingWhy).toMatch(/off-peak inventory is unsold/);
    expect(r.interventions.some((i) => i.id === "I-006")).toBe(true); expect(["INVESTIGATE", "FUNDED"]).toContain(status(r, "I-006"));
  });
  it("conversion and retention are not constraints here (strong direct, strong CRM): the same search signal is a note, not a conversion problem", () => {
    expect(r.diagnosis.constraints.find((c) => c.id === "C-001")!.attainment).toBe(1); expect(r.diagnosis.constraints.find((c) => c.id === "C-003")!.attainment).toBe(1);
    expect(status(r, "I-001")).not.toBe("FUNDED");
    expect(r.fused.find((f) => f.scope === "search")!.verdict).not.toBe("COMMERCIAL_OPPORTUNITY");
  });
  it("past-dated competitor observations do not create a compression exposure at a later date", () => {
    const later = runCycle({ seed: 7, budgetGbp: 30_000, now: "2026-10-20T00:00:00Z", spec: spec2, context: { ...emptyContext("2026-10-20T00:00:00Z"), competitors: competitors(day(10)), capacity: graph2 }, measure: false });
    expect(later.compression.detected).toBe(false);
  });
  it("the capacity engine handles weather-dependent outdoor units and their cleaning bottleneck", () => {
    const g = defaultGraph({ propertyId: "P", rooms: 10, roomsOutOfOrder: 0, peakOccupancy: 0.5, staffingCoverage: 1, nowIso: NOW, source: "t", outdoorUnits: { units: 20, unitsSold: 12, cleaningCapacityPerDay: 15, weatherSensitive: true } });
    const calm = assessCapacity(g, { nowIso: NOW, propertyType: "glamping" }), storm = assessCapacity(g, { nowIso: NOW, propertyType: "glamping", weatherPoor: true });
    const o = calm.find((n) => n.activity === "outdoor")!, os = storm.find((n) => n.activity === "outdoor")!;
    expect(o.bottleneck!.resource).toMatch(/turnarounds/); expect(o.attainableRatio).toBeCloseTo(0.75, 2); expect(o.binds).toBe(false); expect(os.attainableRatio).toBeCloseTo(0.5, 2); expect(os.bottleneck!.resource).toBe("units"); expect(os.binds).toBe(true);
  });
});
