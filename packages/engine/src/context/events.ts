/**
 * FUTURE EVENTS INTELLIGENCE — an event becomes a forward exposure or opportunity only with evidence
 * (attendance, distance, dates). Without evidence it is recorded as INSUFFICIENT EVIDENCE, never as certainty.
 */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, EventRecord, ExternalSignal } from "./types.js";
import { quality } from "./types.js";

/** Declared capture rates: share of attendees who need a room night within reach of the property (assumption). */
export const CAPTURE_BY_DISTANCE: readonly { maxKm: number; rate: number }[] = [{ maxKm: 10, rate: 0.004 }, { maxKm: 30, rate: 0.0015 }, { maxKm: 60, rate: 0.0004 }];
const nights = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86400e3) + 1);

export function eventSignals(spec: PropertySpec, events: readonly EventRecord[], nowIso: string, horizonDays = 120, connectorId = "CONN-EVENTS"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  const now = Date.parse(nowIso), end = now + horizonDays * 86400e3;
  const signals: ExternalSignal[] = []; const assessments: CommercialAssessment[] = [];
  events.filter((e) => Date.parse(e.end) >= now && Date.parse(e.start) <= end).forEach((e, i) => {
    const evidenced = e.expectedAttendance !== null && e.distanceKm !== null;
    const q = quality(evidenced ? 1 : 0.4, e.enteredBy === "provider" ? 0.8 : e.enteredBy === "operator" ? 0.7 : 0.5, (now - Date.parse(nowIso)) / 36e5, "WEEKLY", e.evidenceNote);
    const sid = `SIG-EV-${String(i + 1).padStart(3, "0")}`;
    signals.push({ id: sid, domain: "events", name: e.name, metric: "event.expected_attendance", value: e.expectedAttendance ?? 0, unit: "people", geography: e.venue, observedAt: nowIso, validFrom: e.start, validTo: e.end, horizonDays: Math.round((Date.parse(e.start) - now) / 86400e3), freshness: "WEEKLY", quality: q, source: connectorId, status: e.enteredBy === "simulation" ? "SIMULATED" : "VERIFIED", confidence: evidenced ? 0.6 : 0.2, detail: `${e.category}; ${e.distanceKm ?? "?"} km; ${e.start}–${e.end}; entered by ${e.enteredBy}`, evidence: [] });
    const nn = nights(e.start, e.end);
    if (!evidenced) {
      assessments.push({ id: `CA-EV-${i + 1}`, domain: "events", signalIds: [sid], headline: `${e.name}: INSUFFICIENT EVIDENCE — attendance or distance unknown; no exposure is asserted`, affectedDemandType: "event-driven demand", affectedCapacity: "rooms", direction: "none", commercialEffectGbp: { low: 0, high: 0 }, horizonDays: Math.max(1, Math.round((Date.parse(e.end) - now) / 86400e3)), causalPlausibility: 0.25, plausibilityBasis: "no evidence of scale or proximity", confidence: 0.2, formula: "none — evidence required", assumptions: ["record expected attendance and distance to assess"], perturbation: null, evidence: [] });
      return;
    }
    const capture = CAPTURE_BY_DISTANCE.find((c) => (e.distanceKm ?? Infinity) <= c.maxKm)?.rate ?? 0;
    const spill = (e.expectedAttendance ?? 0) * capture * nn;
    const free = spec.rooms * (1 - Math.min(0.98, spec.occupancy + 0.10)) * nn;
    const captured = Math.min(spill, free);
    const lo = captured * spec.adrGbp * 1.0, hi = captured * spec.adrGbp * 1.25; // rate uplift 0–25 % on compressed nights (assumption)
    assessments.push({ id: `CA-EV-${i + 1}`, domain: "events", signalIds: [sid],
      headline: capture === 0 ? `${e.name}: beyond ${CAPTURE_BY_DISTANCE.at(-1)!.maxKm} km — no capture assumed` : `${e.name}: ${(e.expectedAttendance ?? 0).toLocaleString("en-GB")} attendees at ${e.distanceKm} km over ${nn} night(s): potential compression of ${captured.toFixed(0)} room nights`,
      affectedDemandType: "event-driven demand", affectedCapacity: "rooms", direction: captured > 0 ? "up" : "none", commercialEffectGbp: { low: lo, high: hi }, horizonDays: Math.max(1, Math.round((Date.parse(e.start) - now) / 86400e3)),
      causalPlausibility: 0.5, plausibilityBasis: "large events near a property compress availability; capture rate by distance is assumed, not measured for this property",
      confidence: 0.5 * q.reliability, formula: "min(attendance × capture(distance) × nights, free rooms × nights) × ADR × [1.0, 1.25]",
      assumptions: [`capture rate ${capture} per attendee-night at ${e.distanceKm} km (assumption)`, "free rooms = rooms × (1 − (occupancy + 10 pts))", "rate uplift 0–25 % on compressed nights (assumption)"],
      perturbation: captured > 0 ? { peakOccupancyDelta: Math.min(0.2, captured / (spec.rooms * nn)), adrFactor: 1.05 } : null, evidence: [] });
  });
  return { signals, assessments };
}
