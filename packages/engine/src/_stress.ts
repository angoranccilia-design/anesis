import { runCycle, emptyContext, quality, type ExternalContext, type PropertySpec } from "./index.js";
const NOW = "2026-09-25T00:00:00Z"; const day = (i: number) => new Date(Date.parse(NOW) + i * 86400e3).toISOString().slice(0, 10);
const spec: Partial<PropertySpec> = { id: "PROP-ADV-001", name: "Thornwater Spa Hotel (fictional)", type: "hotel", rooms: 46, adrGbp: 168, occupancy: 0.64, otaShare: 0.58, otaCommission: 0.20, sessionsPerYear: 160_000, mobileShare: 0.66, convDesktop: 0.019, convMobile: 0.0055, pastGuests: 12_000, repeatRate: 0.06, reviewScore: 4.5, lowSeasonWeeks: 16, lowSeasonOcc: 0.41, metaSpendGbp: 30_000, googleSpendGbp: 12_000, ownerPlan: "I-004", location: { name: "Lake District (fictional)", lat: 54.46, lon: -3.09, country: "GB" }, peakOccupancy: 0.80, staffingCoverage: 0.9, weekendShare: 0.6, roomsOutOfOrder: 0 };
const base: ExternalContext = { ...emptyContext(NOW),
  sourceQuality: { "SRC-SIM-CRM": quality(0.7, 0.9, 24 * 45, "DAILY", "CRM export 45 days old") },
  weather: { location: { name: "Lake District", lat: 54.46, lon: -3.09 }, issuedAt: NOW, provider: "scenario", modelNote: "", days: Array.from({ length: 14 }, (_, i) => ({ date: day(i), precipitationMm: 0, tMaxC: 26, tMinC: 14, windMaxKmh: 10, sunshineHours: 12 })) },
  events: [{ id: "EV-1", name: "Kendal Mountain Festival (fictional dates)", start: day(10), end: day(12), expectedAttendance: 25_000, distanceKm: 15, venue: "Kendal", category: "festival", source: "operator", enteredBy: "operator", evidenceNote: "organiser's published attendance last year" }],
  search: [{ term: "lake district spa hotel", geography: "GB", kind: "destination", source: "simulation", weekly: Array.from({ length: 16 }, (_, i) => ({ week: `2026-W${24 + i}`, index: i < 8 ? 50 : 70 })) }],
  ota: { asOf: day(-2) + "T00:00:00Z", channels: [{ name: "Booking.com", share: 0.41, commission: 0.2, rankingPosition: 6, cancellationRate: 0.22, bookingWindowDays: 11 }], shareTrend12m: 0.06, source: "operator" },
  systems: { ads: [{ asOf: day(-1) + "T00:00:00Z", periodDays: 30, channel: "meta", spendGbp: 2500, impressions: 400000, clicks: 9000, attributedBookings: 60, attributedRevenueGbp: 10500, attributionModel: "platform_last_click", source: "operator" }], analytics: { asOf: day(-1) + "T00:00:00Z", periodDays: 30, sessions: 16000, sessionsPrior: 10800, mobileShare: 0.66, pageSpeedMobileMs: 4600, source: "operator" } },
};
const print = (label: string, r: ReturnType<typeof runCycle>) => {
  console.log(`\n=== ${label} ===`);
  console.log("BINDING", r.diagnosis.binding, "|", r.diagnosis.bindingWhy.split(".")[0]);
  for (const c of r.diagnosis.constraints) console.log("  ", c.id, c.kind.padEnd(11), c.factor.padEnd(16), c.attainment.toFixed(2));
  for (const n of r.capacity) console.log("  CAP", n.explanation.slice(0, 160));
  console.log("COMPRESSION", r.compression.decision, r.compression.confidenceLabel, "|", r.compression.inferred.slice(0, 150)); console.log("   observed:", r.compression.observed.slice(0, 4).join(" · ").slice(0, 300)); console.log("   not yet:", r.compression.notYet.join(", "));
  for (const f of r.fused) console.log("  EXT", f.scope.padEnd(28), f.verdict.padEnd(24), `E £${Math.round(f.relevance.expectedGbp)} / τ £${Math.round(f.relevance.materialityGbp)}`);
  console.log("RECONCILE", r.reconciliation.statement.slice(0, 220)); for (const c of r.reconciliation.conflicts) console.log("   conflict:", c.slice(0, 200));
  for (const l of r.allocation.lines) console.log("  ", l.interventionId, l.status.padEnd(11), `EV £${Math.round(l.expectedValueGbp)}`, "|", (l.blockedBy[0] ?? "").slice(0, 110));
  for (const q of r.requirements.filter((x) => x.verdict !== "SUFFICIENT")) console.log("  REQ", q.interventionId, q.verdict, "|", q.missingCritical.join(", "));
  const d = r.decisionSensitivity; console.log("SENSITIVITY", d.currentDecision, "| var:", d.mostSensitiveVariable, "| range:", d.plausibleRange?.slice(0, 60), "| threshold:", d.decisionThreshold, "| mind:", d.whatWouldChangeMyMind);
  console.log("  top rows:", r.sensitivity.slice(0, 4).map((s) => `${s.label} [${s.low}→${s.high}] swing £${Math.round(s.evSwingGbp)}${s.flipsDecision ? " FLIPS" : ""}`).join(" ; "));
  for (const b of r.providerBriefs.filter((x) => x.instruction === "PROCEED" || x.instruction === "PREPARE")) console.log("  PROVIDER", b.providerName, b.role, b.instruction, b.interventionId, "→", b.successThreshold.slice(0, 60), "| deadline", b.deadline);
};
// 1. replay
print("STRESS 1 — replay", runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: base, measure: false }));
// 2. + spa capacity 97 %, waitlist, therapists 82 %
const spaCtx: ExternalContext = { ...base, operations: { asOf: day(-1) + "T00:00:00Z", roomsInService: 46, roomsOutOfOrder: 0, peakOccupancy: 0.80, peakPeriod: "Fri/Sat", staffingCoverage: 0.9, serviceSlotsPerDay: 60, slotUtilisation: 0.97, openingHoursPerWeek: 84, noShowRate: 0.03, cancellationRate: 0.19, waitlistCount: 14, source: "operator" },
  capacity: null, providers: [{ id: "PV-ABC", name: "ABC Digital", role: "web_developer", scope: "booking engine", factors: ["conversion"], systems: ["CONN-BOOKING-ENGINE"] }, { id: "PV-META", name: "Northern Social (Meta agency)", role: "meta_agency", scope: "paid social", factors: ["demand"], systems: ["CONN-META-ADS"] }] };
import { defaultGraph } from "./index.js";
const spaGraph = defaultGraph({ propertyId: "PROP-ADV-001", rooms: 46, roomsOutOfOrder: 0, peakOccupancy: 0.80, staffingCoverage: 0.9, nowIso: NOW, source: "operator", spa: { slotsPerDay: 60, slotsSold: 58, therapistsPlanned: 8, therapistsAvailable: 6.56, treatmentRooms: 6, openingHours: 84 } });
print("STRESS 1 — + spa capacity 97 %, therapists 82 %, waitlist", runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: { ...spaCtx, capacity: spaGraph }, measure: false }));
// 3. + competitors +10–15 % ADR, availability < 10 %
const compCtx: ExternalContext = { ...spaCtx, capacity: spaGraph, competitors: [1, 2, 3, 4, 5].map((k) => ({ competitorId: `CP-${k}`, name: `Comparable ${k}`, observedAt: day(-1) + "T09:00:00Z", date: day(10), rateGbp: Math.round(168 * (1.10 + k * 0.0125)), available: false, reviewScore: 4.3, reviewCount30d: 12, source: "operator", enteredBy: "operator" as const })) };
print("STRESS 1 — + competitors +10–15 % ADR, <10 % available, event 10 d, search +40 %", runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: compCtx, measure: false }));
// 4. extreme perturbation: ADR ×2 declared by an operator is outside the plausible range; the sensitivity must not pick it
const r4 = runCycle({ seed: 42, budgetGbp: 30_000, now: NOW, spec, context: compCtx, measure: false });
console.log("\nPLAUSIBLE RANGES", r4.plausibleRanges.map((p) => `${p.label}: ${p.min}→${p.max} (${p.method})`).join(" | "));
// 5. second property
const spec2: Partial<PropertySpec> = { id: "PROP-BTQ-001", name: "Fellside Boutique Spa Resort (fictional)", type: "spa", rooms: 18, adrGbp: 395, occupancy: 0.58, otaShare: 0.30, otaCommission: 0.18, sessionsPerYear: 70_000, mobileShare: 0.6, convDesktop: 0.026, convMobile: 0.0125, pastGuests: 6_500, repeatRate: 0.24, reviewScore: 4.8, lowSeasonWeeks: 14, lowSeasonOcc: 0.36, metaSpendGbp: 9_000, googleSpendGbp: 9_000, ownerPlan: null, location: { name: "Lake District (fictional)", lat: 54.4, lon: -3.0, country: "GB" }, peakOccupancy: 0.93, staffingCoverage: 0.95, weekendShare: 0.7, roomsOutOfOrder: 0 };
const graph2 = defaultGraph({ propertyId: "PROP-BTQ-001", rooms: 18, roomsOutOfOrder: 0, peakOccupancy: 0.93, staffingCoverage: 0.95, nowIso: NOW, source: "operator", spa: { slotsPerDay: 12, slotsSold: 12, therapistsPlanned: 8, therapistsAvailable: 7, treatmentRooms: 6, openingHours: 70 }, restaurant: { covers: 40, coversSold: 22, kitchenCapacity: 40, serviceStaffPlanned: 6, serviceStaffAvailable: 6 } });
const ctx2: ExternalContext = { ...emptyContext(NOW), weather: base.weather, events: base.events, search: base.search, competitors: compCtx.competitors, capacity: graph2, ota: { asOf: day(-2) + "T00:00:00Z", channels: [{ name: "Booking.com", share: 0.3, commission: 0.18, rankingPosition: 2, cancellationRate: 0.1, bookingWindowDays: 24 }], shareTrend12m: -0.02, source: "operator" }, providers: spaCtx.providers };
print("STRESS 2 — boutique spa resort, same external signals", runCycle({ seed: 7, budgetGbp: 30_000, now: "2026-10-20T00:00:00Z", spec: spec2, context: ctx2, measure: false }));
