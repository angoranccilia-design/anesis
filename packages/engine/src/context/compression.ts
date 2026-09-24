/**
 * COMPETITIVE DEMAND COMPRESSION — comparables tighten (availability falls, ADR rises) while the property keeps inventory,
 * with external demand and a near event. The output separates three things and never collapses them:
 *   OBSERVED   — what the data says (competitors more expensive, availability below x %, event in n days, search +y %)
 *   INFERRED   — what may be happening (demand may be compressing in the window)
 *   DECISION   — what to do (INVESTIGATE pricing and inventory; NOT YET raise prices, NOT YET add acquisition)
 * Exposure logic (documented, no arbitrary score): six components, each 0–1 with its evidence; exposure requires the two
 * anchors (competitive pressure AND property availability) and at least one demand driver; confidence = mean of present
 * components × data-quality factor; LOW < 0.4 ≤ MEDIUM < 0.7 ≤ HIGH.
 */
import type { PropertySpec } from "../property.js";
import type { CommercialAssessment, CompetitorObservation, EventRecord, ExternalSignal, OtaSnapshot, WeatherForecast } from "./types.js";
import { quality as mkQuality } from "./types.js";
import { classifyDay } from "./weather.js";

export interface CompressionComponent { readonly name: string; readonly value: number; readonly present: boolean; readonly observed: string }
export interface CompressionReading {
  readonly observed: readonly string[];
  readonly inferred: string;
  readonly decision: "INVESTIGATE" | "NONE";
  readonly notYet: readonly string[];
  readonly components: readonly CompressionComponent[];
  readonly detected: boolean;
  readonly windowDays: [number, number] | null;
  readonly confidence: number;
  readonly confidenceLabel: "LOW" | "MEDIUM" | "HIGH";
  readonly formula: string;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function compression(spec: PropertySpec, args: { weather: WeatherForecast | null; events: readonly EventRecord[]; competitors: readonly CompetitorObservation[]; ota: OtaSnapshot | null; searchChange: number | null; historicalCompression: number | null; nowIso: string }): { reading: CompressionReading; assessment: CommercialAssessment | null; signal: ExternalSignal | null } {
  const now = Date.parse(args.nowIso); const observed: string[] = [];
  // 1. competitive pressure: ADR gap and availability of comparables for dates ahead
  const ahead = args.competitors.filter((c) => Date.parse(c.date) >= now && Date.parse(c.date) <= now + 30 * 86400e3);
  const rated = ahead.filter((c) => c.rateGbp !== null);
  const marketRate = rated.length ? mean(rated.map((c) => c.rateGbp as number)) : null;
  const adrGap = marketRate !== null ? marketRate / spec.adrGbp - 1 : null;
  const known = ahead.filter((c) => c.available !== null); const unavailable = known.filter((c) => c.available === false).length;
  const availShare = known.length ? 1 - unavailable / known.length : null;
  const pressure = Math.min(1, Math.max(0, (adrGap !== null ? Math.min(1, adrGap / 0.15) : 0) * 0.5 + (availShare !== null ? Math.min(1, (1 - availShare) / 0.9) : 0) * 0.5));
  if (adrGap !== null) observed.push(`comparable-set ADR is ${adrGap >= 0 ? "+" : ""}${(adrGap * 100).toFixed(0)} % vs the property (£${marketRate!.toFixed(0)} vs £${spec.adrGbp}), ${rated.length} observations`);
  if (availShare !== null) observed.push(`comparable availability ${(availShare * 100).toFixed(0)} % (${unavailable}/${known.length} unavailable) on ${known[0]!.date}`);
  // 2. external demand: search change
  const demand = args.searchChange === null ? 0 : Math.min(1, Math.max(0, args.searchChange / 0.4));
  if (args.searchChange !== null) observed.push(`destination search interest ${args.searchChange >= 0 ? "+" : ""}${(args.searchChange * 100).toFixed(0)} % over 8 weeks`);
  // 3. time proximity: event or exceptional weather inside 30 days, closer = stronger
  const ev = args.events.filter((e) => e.expectedAttendance !== null && e.distanceKm !== null && (e.distanceKm ?? 99) <= 30 && Date.parse(e.start) >= now && Date.parse(e.start) <= now + 30 * 86400e3);
  const evDays = ev.map((e) => Math.round((Date.parse(e.start) - now) / 86400e3));
  const exc = (args.weather?.days ?? []).map((d, i) => ({ i, c: classifyDay(d) })).filter((x) => x.c === "exceptional").map((x) => x.i + 1);
  const drivers = [...evDays, ...exc];
  const proximity = drivers.length ? Math.min(1, Math.max(0, 1 - Math.min(...drivers) / 30)) : 0;
  for (const e of ev) observed.push(`${e.name}: ${e.expectedAttendance} attendees at ${e.distanceKm} km, in ${Math.round((Date.parse(e.start) - now) / 86400e3)} days`);
  if (exc.length) observed.push(`${exc.length} exceptional-weather day(s) forecast, first in ${exc[0]} day(s)`);
  // 4. property availability
  const availability = Math.min(1, Math.max(0, (1 - spec.peakOccupancy) / 0.4));
  observed.push(`property peak occupancy ${(spec.peakOccupancy * 100).toFixed(0) } % — inventory ${spec.peakOccupancy < 0.85 ? "retained" : "tight"}`);
  // 5. historical response: measured compression in comparable past periods, if memory has it
  const historical = args.historicalCompression === null ? 0.5 : Math.min(1, Math.max(0, args.historicalCompression));
  observed.push(args.historicalCompression === null ? "no measured historical compression for this property (component set to 0.5, unknown)" : `historical compression response ${args.historicalCompression.toFixed(2)}`);
  // 6. data quality: freshness of competitor observations
  const ageH = ahead.length ? Math.max(...ahead.map((c) => (now - Date.parse(c.observedAt)) / 36e5)) : null;
  const quality = ageH === null ? 0 : ageH <= 36 ? 1 : ageH <= 24 * 7 ? 0.6 : 0.3;
  const comps: CompressionComponent[] = [
    { name: "competitive pressure", value: pressure, present: pressure >= 0.4, observed: observed.slice(0, 2).join("; ") || "no competitor observations" },
    { name: "external demand", value: demand, present: demand >= 0.4, observed: args.searchChange === null ? "no search series" : `${(args.searchChange * 100).toFixed(0)} %` },
    { name: "time proximity", value: proximity, present: proximity >= 0.4, observed: drivers.length ? `nearest driver in ${Math.min(...drivers)} d` : "no near driver" },
    { name: "property availability", value: availability, present: availability >= 0.3, observed: `${((1 - spec.peakOccupancy) * 100).toFixed(0)} % of peak inventory free` },
    { name: "historical response", value: historical, present: historical >= 0.5, observed: args.historicalCompression === null ? "unknown" : String(args.historicalCompression) },
    { name: "data quality", value: quality, present: quality >= 0.6, observed: ageH === null ? "no data" : `competitor data ${ageH.toFixed(0)} h old` },
  ];
  const anchors = comps[0]!.present && comps[3]!.present;
  const driver = comps[1]!.present || comps[2]!.present;
  const detected = anchors && driver && quality > 0;
  const conf = Number((mean(comps.slice(0, 5).map((c) => c.value)) * quality).toFixed(2));
  const label: CompressionReading["confidenceLabel"] = conf >= 0.7 ? "HIGH" : conf >= 0.4 ? "MEDIUM" : "LOW";
  const windowDays: [number, number] | null = drivers.length ? [Math.max(1, Math.min(...drivers) - 1), Math.max(...drivers) + 2] : null;
  const inferred = detected
    ? `Demand may be compressing within the next ${windowDays ? `${windowDays[0]}–${windowDays[1]}` : "30"} days: comparables are tightening while the property retains inventory${driver ? ", with an external demand driver in the window" : ""}. This is an inference, not an observed outcome.`
    : `No demand-compression exposure is inferred: ${!comps[0]!.present ? "competitive pressure is not evidenced" : !comps[3]!.present ? "the property has no spare inventory" : !driver ? "no external demand driver in the window" : "competitor data is missing"}.`;
  const reading: CompressionReading = { observed, inferred, decision: detected ? "INVESTIGATE" : "NONE", notYet: detected ? ["INCREASE PRICING", "INCREASE ACQUISITION"] : [], components: comps, detected, windowDays, confidence: conf, confidenceLabel: label,
    formula: "exposure requires competitive pressure ≥ 0.4 AND property availability ≥ 0.3 AND (external demand ≥ 0.4 OR time proximity ≥ 0.4); confidence = mean(pressure, demand, proximity, availability, historical) × data quality; pressure = 0.5·min(1, ADR gap ÷ 15 %) + 0.5·min(1, comparable unavailability ÷ 90 %); proximity = 1 − nearest driver days ÷ 30; availability = free peak inventory ÷ 40 %" };
  if (!detected) return { reading, assessment: null, signal: null };
  const nights = windowDays ? windowDays[1] - windowDays[0] + 1 : 3;
  const free = spec.rooms * (1 - spec.peakOccupancy) * nights; const gap = marketRate ? Math.max(0, marketRate - spec.adrGbp) : 0;
  const lo = free * 0.3 * spec.adrGbp + spec.rooms * spec.peakOccupancy * nights * gap * 0.3, hi = free * 0.8 * spec.adrGbp + spec.rooms * spec.peakOccupancy * nights * gap * 0.8;
  const signal: ExternalSignal = { id: "SIG-CMP-001", domain: "competitor", name: "Comparable-set tightening (availability and ADR)", metric: "competitor.compression_pressure", value: pressure, unit: "index 0–1", geography: "comparable set", observedAt: ahead[0]?.observedAt ?? args.nowIso, validFrom: args.nowIso.slice(0, 10), validTo: known[0]?.date ?? args.nowIso.slice(0, 10), horizonDays: windowDays ? windowDays[1] : 30, freshness: "DAILY", quality: mkQuality(known.length / Math.max(known.length, 5), 0.7, ageH, "DAILY", "competitor availability and rates by date"), source: "CONN-COMPETITOR", status: ahead.every((c) => c.enteredBy === "simulation") ? "SIMULATED" : "VERIFIED", confidence: conf, detail: observed.slice(0, 2).join("; "), evidence: [] };
  return { reading, signal, assessment: { id: "CA-COMPRESSION", domain: "competitor", signalIds: [signal.id], headline: `FORWARD EXPOSURE — potential demand compression (confidence ${label}). Decision: INVESTIGATE pricing and inventory. Not yet: increase pricing; increase acquisition.`, affectedDemandType: "compressed leisure demand", affectedCapacity: "rooms and rate", direction: "up", commercialEffectGbp: { low: lo, high: hi }, horizonDays: windowDays ? windowDays[1] : 30, causalPlausibility: 0.75, plausibilityBasis: "compression under overlapping demand drivers is well documented; the property's share is inferred, not observed", confidence: conf, formula: "free rooms × [30 %, 80 %] × ADR + occupied rooms × rate gap × [30 %, 80 %] over the window", assumptions: ["30–80 % of free rooms fill and 30–80 % of the rate gap is recoverable (assumptions)", "no price change is recommended: investigation is"], perturbation: { adrFactor: 1.05, peakOccupancyDelta: 0.05 }, evidence: [] } };
}
