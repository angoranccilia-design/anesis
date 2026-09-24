/**
 * PROPERTY OPERATIONS INTELLIGENCE — capacity and operational constraints. A property can have demand it
 * cannot serve; the diagnosis must be able to say CAPACITY or OPERATIONAL rather than DEMAND or CONVERSION.
 */
import type { CommercialAssessment, ExternalSignal, OperationsSnapshot, VisionObservation } from "./types.js";
import { quality } from "./types.js";

export const CAPACITY_BIND_OCC = 0.92;      // peak occupancy at or above which capacity binds (declared)
export const STAFFING_BIND = 0.85;          // staffing coverage below which operations bind (declared)

export function operationsSignals(ops: OperationsSnapshot | null, vision: readonly VisionObservation[], nowIso: string, connectorId = "CONN-PMS"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  const signals: ExternalSignal[] = []; const assessments: CommercialAssessment[] = [];
  if (ops) {
    const age = (Date.parse(nowIso) - Date.parse(ops.asOf)) / 36e5;
    const q = quality(1, 0.9, age, "DAILY", "operations snapshot");
    const st = ops.source === "simulation" ? "SIMULATED" : "VERIFIED";
    signals.push(
      { id: "SIG-OP-001", domain: "pms", name: `Peak occupancy (${ops.peakPeriod})`, metric: "ops.peak_occupancy", value: ops.peakOccupancy, unit: "ratio", geography: "property", observedAt: ops.asOf, validFrom: ops.asOf, validTo: ops.asOf, horizonDays: 0, freshness: "DAILY", quality: q, source: connectorId, status: st, confidence: 0.9, detail: `${ops.roomsInService} rooms in service, ${ops.roomsOutOfOrder} out of order`, evidence: [] },
      { id: "SIG-OP-002", domain: "pms", name: "Staffing coverage vs plan", metric: "ops.staffing_coverage", value: ops.staffingCoverage, unit: "ratio", geography: "property", observedAt: ops.asOf, validFrom: ops.asOf, validTo: ops.asOf, horizonDays: 0, freshness: "WEEKLY", quality: q, source: connectorId, status: st, confidence: 0.8, detail: `${ops.openingHoursPerWeek} opening hours/week; ${ops.waitlistCount} on waitlist`, evidence: [] },
      { id: "SIG-OP-003", domain: "pms", name: "Cancellation and no-show", metric: "ops.cancellation_rate", value: ops.cancellationRate, unit: "ratio", geography: "property", observedAt: ops.asOf, validFrom: ops.asOf, validTo: ops.asOf, horizonDays: 0, freshness: "WEEKLY", quality: q, source: connectorId, status: st, confidence: 0.9, detail: `no-show ${(ops.noShowRate * 100).toFixed(1)} %`, evidence: [] },
    );
    if (ops.slotUtilisation !== null && ops.serviceSlotsPerDay !== null) signals.push({ id: "SIG-OP-004", domain: "pms", name: "Service slot utilisation", metric: "ops.slot_utilisation", value: ops.slotUtilisation, unit: "ratio", geography: "property", observedAt: ops.asOf, validFrom: ops.asOf, validTo: ops.asOf, horizonDays: 0, freshness: "DAILY", quality: q, source: connectorId, status: st, confidence: 0.9, detail: `${ops.serviceSlotsPerDay} slots/day`, evidence: [] });
  }
  vision.forEach((v, i) => signals.push({ id: `SIG-CV-${String(i + 1).padStart(3, "0")}`, domain: "vision", name: `${v.zone}: ${v.metric}`, metric: `vision.${v.metric}`, value: v.value, unit: v.metric === "queue_length" ? "people" : v.metric === "vehicles" ? "vehicles" : "ratio", geography: v.zone, observedAt: v.sampledAt, validFrom: v.sampledAt, validTo: v.sampledAt, horizonDays: 0, freshness: "REAL_TIME", quality: quality(1, v.confidence, (Date.parse(nowIso) - Date.parse(v.sampledAt)) / 36e5, "REAL_TIME", `model ${v.modelId}; frame not retained`), source: `CONN-CAMERA:${v.cameraId}`, status: "VERIFIED", confidence: v.confidence, detail: "structured observation only; no identity data exists in this record", evidence: [] }));
  return { signals, assessments };
}
