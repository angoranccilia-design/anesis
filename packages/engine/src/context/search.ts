/**
 * SEARCH / DEMAND INTELLIGENCE — search interest is a leading indicator of demand, not revenue.
 * The one pattern this module detects: search rising while direct revenue is flat, which points at a
 * conversion or visibility problem, never at a revenue gain.
 */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, ExternalSignal, SearchSeries } from "./types.js";
import { quality } from "./types.js";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function searchSignals(spec: PropertySpec, series: readonly SearchSeries[], directWeeklyRevenue: readonly number[], nowIso: string, connectorId = "CONN-SEARCH"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  const signals: ExternalSignal[] = []; const assessments: CommercialAssessment[] = [];
  const rev = directWeeklyRevenue; const revRecent = mean(rev.slice(-8)), revPrior = mean(rev.slice(-16, -8));
  const revChange = revPrior > 0 ? revRecent / revPrior - 1 : 0;
  series.forEach((s, i) => {
    const w = s.weekly.map((x) => x.index); if (w.length < 16) return;
    const recent = mean(w.slice(-8)), prior = mean(w.slice(-16, -8)); const change = prior > 0 ? recent / prior - 1 : 0;
    const q = quality(1, 0.6, 24 * 3, "WEEKLY", "relative index, not volume");
    const sid = `SIG-SR-${String(i + 1).padStart(3, "0")}`;
    signals.push({ id: sid, domain: "search", name: `Search interest: ${s.term} (${s.kind})`, metric: "search.index_change_8w", value: change, unit: "ratio", geography: s.geography, observedAt: nowIso, validFrom: s.weekly.at(-8)?.week ?? "", validTo: s.weekly.at(-1)?.week ?? "", horizonDays: 0, freshness: "WEEKLY", quality: q, source: connectorId, status: s.source === "simulation" ? "SIMULATED" : "VERIFIED", confidence: 0.6, detail: `8-week mean ${recent.toFixed(0)} vs prior ${prior.toFixed(0)}; direct revenue change ${(revChange * 100).toFixed(0)} % over the same weeks; search interest ≠ revenue`, evidence: [] });
    if (change >= 0.15 && revChange < 0.05) {
      const extraSessions = (spec.sessionsPerYear / 52) * 8 * change;
      const blended = spec.mobileShare * spec.convMobile + (1 - spec.mobileShare) * spec.convDesktop;
      const value = extraSessions * blended * spec.adrGbp * 1.9;
      assessments.push({ id: `CA-SR-${i + 1}`, domain: "search", signalIds: [sid], headline: `${s.kind === "branded" ? "Branded" : s.kind === "destination" ? "Destination" : "Non-branded"} search interest up ${(change * 100).toFixed(0)} % over 8 weeks while direct revenue is ${revChange >= 0 ? "up only" : "down"} ${(Math.abs(revChange) * 100).toFixed(0)} %: demand is arriving and not converting`, affectedDemandType: `${s.kind} search demand`, affectedCapacity: "none", direction: "up", commercialEffectGbp: { low: value * 0.5, high: value * 1.5 }, horizonDays: 56, causalPlausibility: 0.5, plausibilityBasis: "search interest leads bookings for leisure stays; conversion of that interest is the property's own funnel; magnitude assumed", confidence: 0.5, formula: "sessions/52 × 8 × Δindex × blended conversion × booking value × [0.5, 1.5]", assumptions: ["search index change translates 1:1 into session change (assumption)", "search interest is not revenue"], perturbation: { sessionsFactor: 1 + change * (8 / 52) }, evidence: [] });
    }
  });
  return { signals, assessments };
}
