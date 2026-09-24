/** OTA INTELLIGENCE — dependency is a capital-allocation input: rising share + weak direct conversion + commission exposure = margin exposure. */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, ExternalSignal, OtaSnapshot } from "./types.js";
import { quality } from "./types.js";

export function otaSignals(spec: PropertySpec, ota: OtaSnapshot | null, conversionAttainment: number, nowIso: string, connectorId = "CONN-OTA"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  if (!ota) return { signals: [], assessments: [] };
  const age = (Date.parse(nowIso) - Date.parse(ota.asOf)) / 36e5;
  const q = quality(1, 0.85, age, "WEEKLY", "channel mix from the channel manager / PMS");
  const share = ota.channels.reduce((a, c) => a + c.share, 0);
  const commission = share > 0 ? ota.channels.reduce((a, c) => a + c.share * c.commission, 0) / share : 0;
  const signals: ExternalSignal[] = [
    { id: "SIG-OTA-001", domain: "ota", name: "OTA share of room nights", metric: "ota.share", value: share, unit: "ratio", geography: "property", observedAt: ota.asOf, validFrom: ota.asOf, validTo: ota.asOf, horizonDays: 0, freshness: "WEEKLY", quality: q, source: connectorId, status: ota.source === "simulation" ? "SIMULATED" : "VERIFIED", confidence: 0.9, detail: ota.channels.map((c) => `${c.name} ${(c.share * 100).toFixed(0)} % @ ${(c.commission * 100).toFixed(0)} %`).join(", "), evidence: [] },
    { id: "SIG-OTA-002", domain: "ota", name: "OTA share trend (12 months)", metric: "ota.share_trend_12m", value: ota.shareTrend12m, unit: "points", geography: "property", observedAt: ota.asOf, validFrom: ota.asOf, validTo: ota.asOf, horizonDays: 0, freshness: "MONTHLY", quality: q, source: connectorId, status: ota.source === "simulation" ? "SIMULATED" : "VERIFIED", confidence: 0.8, detail: `share moved ${ota.shareTrend12m >= 0 ? "+" : ""}${(ota.shareTrend12m * 100).toFixed(1)} points in 12 months`, evidence: [] },
  ];
  const assessments: CommercialAssessment[] = [];
  const revenue = spec.rooms * 365 * spec.occupancy * spec.adrGbp;
  if (ota.shareTrend12m >= 0.03 && conversionAttainment < 0.85) {
    const lo = revenue * ota.shareTrend12m * commission, hi = revenue * ota.shareTrend12m * 2 * commission;
    assessments.push({ id: "CA-OTA-001", domain: "ota", signalIds: ["SIG-OTA-001", "SIG-OTA-002"], headline: `OTA dependency rising (+${(ota.shareTrend12m * 100).toFixed(1)} pts) while direct conversion is at ${(conversionAttainment * 100).toFixed(0)} % of benchmark: future margin exposure`, affectedDemandType: "direct bookings", affectedCapacity: "none", direction: "down", commercialEffectGbp: { low: lo, high: hi }, horizonDays: 365, causalPlausibility: 0.75, plausibilityBasis: "commission on shifted nights is arithmetic; the continuation of the trend is the assumption", confidence: 0.7 * (q.stale ? 0.5 : 1), formula: "room revenue × share trend × [1, 2] × blended commission", assumptions: ["trend continues for 12 months (assumption)"], perturbation: { otaShareDelta: ota.shareTrend12m }, evidence: [] });
  }
  return { signals, assessments };
}
