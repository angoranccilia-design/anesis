/**
 * COMPETITIVE / MARKET INTELLIGENCE — observations of comparable properties (rates, availability, reviews),
 * and the attribution question: is the property's change internal or environmental? The attribution test
 * uses the property's own weekly history against its comparables; it is a real computation, not an opinion.
 */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, CompetitorObservation, ExternalSignal } from "./types.js";
import { quality } from "./types.js";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function competitiveSignals(spec: PropertySpec, obs: readonly CompetitorObservation[], nowIso: string, connectorId = "CONN-COMPETITOR"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  const signals: ExternalSignal[] = []; const assessments: CommercialAssessment[] = [];
  const rated = obs.filter((o) => o.rateGbp !== null);
  if (!rated.length) return { signals, assessments };
  const age = Math.max(...rated.map((o) => (Date.parse(nowIso) - Date.parse(o.observedAt)) / 36e5));
  const q = quality(rated.length / Math.max(rated.length, 5), rated.every((o) => o.enteredBy === "provider") ? 0.8 : 0.6, age, "DAILY", "rate observations by date");
  const marketRate = mean(rated.map((o) => o.rateGbp as number));
  const gap = marketRate / spec.adrGbp - 1; // + = market above the property
  signals.push({ id: "SIG-CP-001", domain: "competitor", name: "Comparable-set rate vs property ADR", metric: "competitor.rate_gap", value: gap, unit: "ratio", geography: "comparable set", observedAt: rated[0]!.observedAt, validFrom: rated.map((o) => o.date).sort()[0]!, validTo: rated.map((o) => o.date).sort().at(-1)!, horizonDays: 30, freshness: "DAILY", quality: q, source: connectorId, status: rated.every((o) => o.enteredBy === "simulation") ? "SIMULATED" : "VERIFIED", confidence: 0.6 * (q.stale ? 0.5 : 1), detail: `market mean £${marketRate.toFixed(0)} vs ADR £${spec.adrGbp}; ${rated.length} observations; ${q.note}`, evidence: [] });
  if (gap <= -0.10) {
    const exposure = spec.rooms * 365 * spec.occupancy * spec.adrGbp * 0.03; // 3 % of room revenue at risk per year from a ≥10 % undercut (assumption)
    assessments.push({ id: "CA-CP-001", domain: "competitor", signalIds: ["SIG-CP-001"], headline: `Comparable set is ${(Math.abs(gap) * 100).toFixed(0)} % below the property's ADR: conversion and direct-capture exposure`, affectedDemandType: "rate-sensitive leisure demand", affectedCapacity: "none", direction: "down", commercialEffectGbp: { low: exposure * 0.5, high: exposure * 1.5 }, horizonDays: 90, causalPlausibility: 0.5, plausibilityBasis: "relative price affects conversion of undecided demand; size assumed", confidence: 0.5 * (q.stale ? 0.5 : 1), formula: "room revenue × 3 % × [0.5, 1.5] when market rate ≤ ADR − 10 %", assumptions: ["3 % of room revenue per year at risk (assumption)", q.stale ? "STALE competitor data: confidence halved" : "fresh observations"], perturbation: { convFactor: 0.95 }, evidence: [] });
  }
  return { signals, assessments };
}

/** Internal vs environmental attribution from weekly histories (property and comparables). */
export function attribution(property: readonly number[], comparables: readonly (readonly number[])[], recentWeeks = 8, baseWeeks = 26): { propertyChange: number; marketChange: number; verdict: "internal" | "environmental" | "mixed" | "no_change"; note: string } {
  const change = (s: readonly number[]) => { const r = mean(s.slice(-recentWeeks)), b = mean(s.slice(-recentWeeks - baseWeeks, -recentWeeks)); return b > 0 ? r / b - 1 : 0; };
  const p = change(property), m = mean(comparables.map(change));
  const diff = p - m;
  const verdict = Math.abs(p) < 0.03 && Math.abs(m) < 0.03 ? "no_change" : Math.abs(diff) < 0.03 ? "environmental" : Math.abs(m) < 0.03 ? "internal" : "mixed";
  return { propertyChange: p, marketChange: m, verdict, note: `property ${(p * 100).toFixed(1)} % vs comparables ${(m * 100).toFixed(1)} % (last ${recentWeeks} weeks vs prior ${baseWeeks}); ${verdict === "environmental" ? "the market moved the same way: environmental" : verdict === "internal" ? "comparables did not move: internal" : verdict === "mixed" ? "both moved, by different amounts" : "no material change either side"}` };
}
