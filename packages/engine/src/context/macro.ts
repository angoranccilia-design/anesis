/** MACRO / ECONOMIC CONTEXT — every indicator carries source, date, geography, frequency, confidence, and mostly concludes NO MATERIAL DECISION IMPACT. */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, ExternalSignal, MacroIndicator } from "./types.js";
import { quality } from "./types.js";

export function macroSignals(spec: PropertySpec, indicators: readonly MacroIndicator[], nowIso: string): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  const signals: ExternalSignal[] = []; const assessments: CommercialAssessment[] = [];
  indicators.forEach((m, i) => {
    const age = (Date.parse(nowIso) - Date.parse(m.asOf)) / 36e5;
    const sid = `SIG-MC-${String(i + 1).padStart(3, "0")}`;
    signals.push({ id: sid, domain: "macro", name: m.name, metric: m.id, value: m.value, unit: m.unit, geography: m.geography, observedAt: m.asOf, validFrom: m.asOf, validTo: m.asOf, horizonDays: 0, freshness: m.frequency, quality: quality(1, 0.9, age, m.frequency, `${m.source}; single observation, no trend available in this environment`), source: m.source, status: m.status, confidence: 0.9, detail: `${m.name} ${m.value} ${m.unit} as of ${m.asOf} (${m.source})`, evidence: [] });
    if (m.id.startsWith("fx.")) {
      // Inbound leisure demand elasticity to GBP strength: assumed ±0.3 % of room revenue per 1 % GBP move over 12 months; with one observation no move is measured.
      assessments.push({ id: `CA-MC-${i + 1}`, domain: "macro", signalIds: [sid], headline: `${m.name}: single observation — no move measured, no decision impact asserted`, affectedDemandType: "inbound leisure demand", affectedCapacity: "none", direction: "none", commercialEffectGbp: { low: 0, high: 0 }, horizonDays: 365, causalPlausibility: 0.5, plausibilityBasis: "exchange rates affect inbound leisure demand with lags; only a measured move over time could matter", confidence: 0.9, formula: "room revenue × 0.3 % × Δrate % (assumption) — Δrate unavailable", assumptions: ["a reference series would be needed to measure a move"], perturbation: null, evidence: [] });
    }
    if (m.id.startsWith("inflation.")) {
      const margin = spec.rooms * 365 * spec.occupancy * spec.adrGbp * 0.006 * m.value; // 0.6 % of revenue per point of inflation on the cost base (assumption)
      assessments.push({ id: `CA-MC-${i + 1}`, domain: "macro", signalIds: [sid], headline: `${m.name} ${m.value} ${m.unit}: cost-base pressure on margin`, affectedDemandType: "none", affectedCapacity: "none", direction: "down", commercialEffectGbp: { low: margin * 0.5, high: margin * 1.5 }, horizonDays: 365, causalPlausibility: 0.75, plausibilityBasis: "input-cost inflation compresses margin unless passed through to rate", confidence: 0.7, formula: "room revenue × 0.6 % × inflation points × [0.5, 1.5]", assumptions: ["60 % cost base, no pass-through (assumption)"], perturbation: { commissionDelta: 0 }, evidence: [] });
    }
  });
  return { signals, assessments };
}
