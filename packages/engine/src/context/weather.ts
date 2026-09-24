/**
 * WEATHER INTELLIGENCE — a forecast becomes a commercial variable only through a declared rule for the
 * property type. Rules are assumptions (status MODELLED) and say so. If the effect is immaterial, the
 * relevance engine says NO MATERIAL DECISION IMPACT and the weather is not put forward.
 */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, ExternalSignal, WeatherForecast, DataQuality } from "./types.js";
import { quality } from "./types.js";

const isWeekend = (d: string): boolean => { const w = new Date(d + "T12:00:00Z").getUTCDay(); return w === 5 || w === 6; };
type DayClass = "exceptional" | "poor" | "neutral";
export const classifyDay = (d: { precipitationMm: number; tMaxC: number; windMaxKmh: number }): DayClass =>
  d.precipitationMm >= 8 || d.windMaxKmh >= 55 ? "poor" : d.tMaxC >= 22 && d.precipitationMm < 1 && d.windMaxKmh < 30 ? "exceptional" : "neutral";

/** Declared elasticities by property type — assumptions, not measurements. */
const RULES: Record<PropertySpec["type"], { upOnExceptional: [number, number]; downOnPoor: [number, number]; demandType: string; capacity: string; plausibility: number; basis: string }> = {
  hotel:            { upOnExceptional: [0.10, 0.25], downOnPoor: [0.03, 0.08], demandType: "leisure short-break demand", capacity: "rooms", plausibility: 0.5, basis: "leisure hotels see modest weather-driven short-break compression; effect size assumed" },
  country_house:    { upOnExceptional: [0.15, 0.35], downOnPoor: [0.05, 0.12], demandType: "leisure weekend demand", capacity: "rooms", plausibility: 0.5, basis: "rural leisure demand is weather-sensitive at short lead times; effect size assumed" },
  resort:           { upOnExceptional: [0.10, 0.25], downOnPoor: [0.05, 0.12], demandType: "leisure demand", capacity: "rooms", plausibility: 0.5, basis: "assumed" },
  glamping:         { upOnExceptional: [0.20, 0.40], downOnPoor: [0.15, 0.35], demandType: "outdoor stays", capacity: "pitches / units", plausibility: 0.75, basis: "outdoor accommodation cancels and converts on weather; direction well established, size assumed" },
  ecolodge:         { upOnExceptional: [0.15, 0.35], downOnPoor: [0.10, 0.30], demandType: "outdoor stays", capacity: "units", plausibility: 0.75, basis: "as glamping" },
  spa:              { upOnExceptional: [-0.05, 0.0], downOnPoor: [-0.25, -0.10], demandType: "last-minute spa demand", capacity: "treatment slots", plausibility: 0.5, basis: "rain moves leisure demand indoors: a negative 'down' value means demand rises on poor weather; assumed" },
  wellness_retreat: { upOnExceptional: [-0.05, 0.0], downOnPoor: [-0.20, -0.05], demandType: "short-notice wellness demand", capacity: "treatment slots", plausibility: 0.5, basis: "as spa" },
};

export function weatherSignals(spec: PropertySpec, wx: WeatherForecast | null, q: DataQuality | undefined, connectorId = "CONN-WEATHER"): { signals: ExternalSignal[]; assessments: CommercialAssessment[] } {
  if (!wx || wx.days.length === 0) return { signals: [], assessments: [] };
  const qual = q ?? quality(1, 0.8, 0, "DAILY", "forecast skill declines with lead time");
  const signals: ExternalSignal[] = wx.days.map((d, i) => ({
    id: `SIG-WX-${String(i + 1).padStart(3, "0")}`, domain: "weather", name: `Forecast ${d.date}`, metric: "weather.day_class",
    value: classifyDay(d) === "exceptional" ? 1 : classifyDay(d) === "poor" ? -1 : 0, unit: "class(−1 poor, 0 neutral, +1 exceptional)",
    geography: wx.location.name, observedAt: wx.issuedAt, validFrom: d.date, validTo: d.date, horizonDays: i + 1,
    freshness: "DAILY", quality: { ...qual, reliability: Math.max(0.3, qual.reliability - 0.04 * i), note: `${qual.note}; lead ${i + 1} d` },
    source: connectorId, status: "VERIFIED", confidence: Math.max(0.3, 0.9 - 0.04 * i),
    detail: `${d.precipitationMm.toFixed(1)} mm, max ${d.tMaxC.toFixed(0)} °C, wind ${d.windMaxKmh.toFixed(0)} km/h (${wx.provider}); confidence falls 4 points per lead day (assumption)`, evidence: [],
  }));
  const rule = RULES[spec.type];
  const nightsWeekend = spec.rooms * (1 - Math.min(0.98, spec.occupancy + 0.15)); // rooms free on a typical weekend night (assumption: weekend occ = annual + 15 pts)
  const nightsWeekday = spec.rooms * (1 - Math.max(0.05, spec.occupancy - 0.10));
  const value = (share: [number, number], day: string, sign: 1 | -1): [number, number] => {
    const base = sign === 1 ? (isWeekend(day) ? nightsWeekend : nightsWeekday * 0.5) : spec.rooms * (isWeekend(day) ? spec.occupancy + 0.15 : spec.occupancy);
    return [base * share[0] * spec.adrGbp, base * share[1] * spec.adrGbp];
  };
  let upLo = 0, upHi = 0, downLo = 0, downHi = 0; const upDays: string[] = [], poorDays: string[] = [];
  wx.days.forEach((d, i) => {
    const c = classifyDay(d); const conf = signals[i]?.confidence ?? 0.5;
    if (c === "exceptional") { const [a, b] = value(rule.upOnExceptional, d.date, 1); upLo += a * conf; upHi += b * conf; upDays.push(d.date); }
    if (c === "poor") { const [a, b] = value(rule.downOnPoor, d.date, -1); downLo += a * conf; downHi += b * conf; poorDays.push(d.date); }
  });
  const assessments: CommercialAssessment[] = [];
  const horizon = wx.days.length;
  const revenueHorizon = (spec.rooms * 365 * spec.occupancy * spec.adrGbp) * horizon / 365;
  if (upDays.length) assessments.push({
    id: "CA-WX-UP", domain: "weather", signalIds: signals.filter((s) => s.value === 1).map((s) => s.id),
    headline: `${upDays.length} exceptional-weather day(s) in the next ${horizon}: potential ${rule.demandType} compression`,
    affectedDemandType: rule.demandType, affectedCapacity: rule.capacity, direction: "up",
    commercialEffectGbp: { low: Math.min(upLo, upHi), high: Math.max(upLo, upHi) }, horizonDays: horizon, causalPlausibility: rule.plausibility, plausibilityBasis: rule.basis,
    confidence: Math.min(...upDays.map((d) => signals[wx.days.findIndex((x) => x.date === d)]?.confidence ?? 0.5)),
    formula: "Σ_days free rooms that night × uplift[low, high] × ADR × forecast confidence", assumptions: [`uplift ${rule.upOnExceptional[0]}–${rule.upOnExceptional[1]} of free rooms on exceptional days (assumption)`, "weekend occupancy = annual + 15 points (assumption)"],
    perturbation: { sessionsFactor: 1 + ((upLo + upHi) / 2) / Math.max(1, revenueHorizon) * (horizon / 365) }, evidence: [],
  });
  if (poorDays.length) assessments.push({
    id: "CA-WX-DOWN", domain: "weather", signalIds: signals.filter((s) => s.value === -1).map((s) => s.id),
    headline: `${poorDays.length} poor-weather day(s) in the next ${horizon}: ${rule.downOnPoor[0] < 0 ? "potential indoor demand increase" : "cancellation / conversion risk"} on ${rule.demandType}`,
    affectedDemandType: rule.demandType, affectedCapacity: rule.capacity, direction: rule.downOnPoor[0] < 0 ? "up" : "down",
    commercialEffectGbp: { low: Math.min(Math.abs(downLo), Math.abs(downHi)), high: Math.max(Math.abs(downLo), Math.abs(downHi)) }, horizonDays: horizon, causalPlausibility: rule.plausibility, plausibilityBasis: rule.basis,
    confidence: Math.min(...poorDays.map((d) => signals[wx.days.findIndex((x) => x.date === d)]?.confidence ?? 0.5)),
    formula: "Σ_days occupied rooms that night × cancellation share[low, high] × ADR × forecast confidence", assumptions: [`share ${rule.downOnPoor[0]}–${rule.downOnPoor[1]} of occupied rooms at risk on poor days (assumption)`],
    perturbation: { sessionsFactor: 1 - (Math.abs(downLo + downHi) / 2) / Math.max(1, revenueHorizon) * (horizon / 365) * Math.sign(rule.downOnPoor[0] < 0 ? -1 : 1) }, evidence: [],
  });
  return { signals, assessments };
}
