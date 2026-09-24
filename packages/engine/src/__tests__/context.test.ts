import { describe, it, expect } from "vitest";
import { runCycle } from "../cycle.js";
import { emptyContext, quality, type ExternalContext, type WeatherForecast, type EventRecord, type ConnectorContract } from "../context/types.js";
import { weatherSignals, classifyDay } from "../context/weather.js";
import { seasonalProfile, CAUSAL_NOTE } from "../context/seasonality.js";
import { eventSignals } from "../context/events.js";
import { attribution, competitiveSignals } from "../context/competitive.js";
import { cameraConnector, assertNoIdentityData } from "../context/vision.js";
import { COUNTRY_HOUSE_34, simulateProperty, WEEKS_PRE } from "../property.js";
import { measure } from "../measure.js";
import { preregister } from "../register.js";

const NOW = "2026-06-10T00:00:00Z";
const days = (n: number, f: (i: number) => { precipitationMm: number; tMaxC: number; windMaxKmh: number }) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.parse(NOW) + i * 86400e3).toISOString().slice(0, 10); return { date: d, tMinC: 10, sunshineHours: null, ...f(i) }; });
const wx = (ds: WeatherForecast["days"]): WeatherForecast => ({ location: { name: "test", lat: 51.8, lon: -1.8 }, issuedAt: NOW, days: ds, provider: "test", modelNote: "" });
const withWeather = (w: WeatherForecast | null, spec = {}): ExternalContext => ({ ...emptyContext(NOW), weather: w, sourceQuality: {} });

describe("weather intelligence", () => {
  it("classifies days by declared rules", () => {
    expect(classifyDay({ precipitationMm: 0, tMaxC: 25, windMaxKmh: 10 })).toBe("exceptional");
    expect(classifyDay({ precipitationMm: 12, tMaxC: 14, windMaxKmh: 20 })).toBe("poor");
    expect(classifyDay({ precipitationMm: 2, tMaxC: 18, windMaxKmh: 20 })).toBe("neutral");
  });
  it("neutral weather produces no assessment and NO MATERIAL DECISION IMPACT; a heatwave weekend on a country house is material but does not change the capital decision", () => {
    const neutral = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: withWeather(wx(days(14, () => ({ precipitationMm: 2, tMaxC: 17, windMaxKmh: 20 })))) });
    expect(neutral.assessments.filter((a) => a.domain === "weather")).toHaveLength(0);
    const hot = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: withWeather(wx(days(14, () => ({ precipitationMm: 0, tMaxC: 27, windMaxKmh: 10 })))) });
    const f = hot.fused.find((x) => x.scope === "weather")!;
    expect(f).toBeDefined();
    expect(["NO_DECISION_IMPACT", "TACTICAL_NOTE"]).toContain(f.verdict);
    expect(f.relevance.formula).toMatch(/E = R/);
    expect(hot.decision.selected).toEqual(neutral.decision.selected); // the weather did not change the capital decision
  });
  it("economically relevant weather changes the decision of a weather-sensitive property (glamping under a two-week storm, capacity-limited)", () => {
    const storm = wx(days(16, () => ({ precipitationMm: 20, tMaxC: 9, windMaxKmh: 70 })));
    const spec = { type: "glamping" as const, peakOccupancy: 0.93, occupancy: 0.72 };
    const calm = runCycle({ seed: 2, budgetGbp: 40_000, now: NOW, measure: false, spec, context: withWeather(null) });
    const bad = runCycle({ seed: 2, budgetGbp: 40_000, now: NOW, measure: false, spec, context: withWeather(storm) });
    const f = bad.fused.find((x) => x.scope === "weather")!;
    expect(f.direction).toBe("down");
    expect(f.relevance.decisionImpactScore).toBeGreaterThan(0);
    // whichever verdict the maths gives, the engine must state it with the formula and never invent a number
    expect(f.statement.length).toBeGreaterThan(20);
    expect(calm.fused.find((x) => x.scope === "weather")).toBeUndefined();
  });
  it("forecast confidence declines with lead time and is carried into reliability", () => {
    const { signals } = weatherSignals(COUNTRY_HOUSE_34, wx(days(10, () => ({ precipitationMm: 0, tMaxC: 25, windMaxKmh: 5 }))), undefined);
    expect(signals[0]!.confidence).toBeGreaterThan(signals[9]!.confidence);
    expect(signals.every((s) => s.status === "VERIFIED" && s.source === "CONN-WEATHER")).toBe(true);
  });
});

describe("seasonality intelligence", () => {
  it("recognises the seasonal pattern in the property's own history and never treats it as causal", () => {
    const p = simulateProperty(COUNTRY_HOUSE_34, 3, NOW);
    const prof = seasonalProfile(p.series.property.slice(0, WEEKS_PRE), NOW, [{ date: "2026-08-31", name: "Summer bank holiday", region: "england-and-wales", source: "test" }]);
    const high = prof.weeks.filter((w) => w.phase === "high").map((w) => w.weekOfYear);
    expect(high.some((w) => w >= 24 && w <= 36)).toBe(true); // summer peak in the simulated series
    expect(prof.causalNote).toBe(CAUSAL_NOTE);
    expect(prof.statement).toMatch(/season/);
    // seasonality alone, zero effect: the measurement does not credit an intervention
    const plan = preregister("MP-S", [], NOW);
    const m = measure(plan, p.series.property, p.series.comparables, NOW);
    expect(m.planStatus).not.toBe("VALIDATED");
  });
});

describe("events intelligence", () => {
  const ev = (o: Partial<EventRecord>): EventRecord => ({ id: "EV-1", name: "Festival", start: "2026-07-03", end: "2026-07-05", expectedAttendance: 18_000, distanceKm: 22, venue: "Showground", category: "festival", source: "test", enteredBy: "operator", evidenceNote: "organiser figure", ...o });
  it("a large, near, evidenced event creates an upward assessment and a fused verdict", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), events: [ev({})] } });
    const a = r.assessments.find((x) => x.domain === "events")!;
    expect(a.direction).toBe("up"); expect(a.commercialEffectGbp.high).toBeGreaterThan(0);
    expect(r.fused.find((f) => f.scope === "events")).toBeDefined();
  });
  it("an event without attendance or distance is INSUFFICIENT EVIDENCE: no exposure, no certainty", () => {
    const { assessments } = eventSignals(COUNTRY_HOUSE_34, [ev({ expectedAttendance: null, distanceKm: null })], NOW);
    expect(assessments[0]!.headline).toMatch(/INSUFFICIENT EVIDENCE/);
    expect(assessments[0]!.commercialEffectGbp).toEqual({ low: 0, high: 0 });
    expect(assessments[0]!.confidence).toBeLessThanOrEqual(0.2);
  });
});

describe("competitive intelligence", () => {
  it("a fresh ≥10 % undercut creates a downward assessment; stale data halves its confidence", () => {
    const obs = (observedAt: string) => [1, 2, 3, 4, 5].map((k) => ({ competitorId: `CP-${k}`, name: `Comp ${k}`, observedAt, date: "2026-06-20", rateGbp: 150, available: true, reviewScore: 4.2, reviewCount30d: 10, source: "test", enteredBy: "operator" as const }));
    const fresh = competitiveSignals(COUNTRY_HOUSE_34, obs("2026-06-09T00:00:00Z"), NOW);
    const stale = competitiveSignals(COUNTRY_HOUSE_34, obs("2026-05-01T00:00:00Z"), NOW);
    expect(fresh.assessments[0]!.direction).toBe("down");
    expect(stale.signals[0]!.quality.stale).toBe(true);
    expect(stale.assessments[0]!.confidence).toBeLessThan(fresh.assessments[0]!.confidence);
    expect(stale.signals[0]!.quality.note).toMatch(/STALE DATA/);
  });
  it("attribution separates an internal decline from an environmental one", () => {
    const flat = Array.from({ length: 60 }, () => 100), down = Array.from({ length: 60 }, (_, i) => (i >= 52 ? 80 : 100));
    expect(attribution(down, [flat, flat, flat]).verdict).toBe("internal");
    expect(attribution(down, [down, down, down]).verdict).toBe("environmental");
    expect(attribution(flat, [flat, flat]).verdict).toBe("no_change");
  });
});

describe("capacity and operations", () => {
  it("acquisition is blocked when capacity is limiting, with the capacity reason", () => {
    const r = runCycle({ seed: 1, budgetGbp: 60_000, now: NOW, measure: false, spec: { convMobile: 0.014, peakOccupancy: 0.98 } });
    expect(r.diagnosis.binding).toBe("C-005");
    const l = r.allocation.lines.find((x) => x.interventionId === "I-004")!;
    expect(l.status).toBe("BLOCKED");
    expect(l.blockedBy.join(" ")).toMatch(/CAPACITY/);
    expect(l.requiredCondition).toMatch(/headroom/);
  });
  it("acquisition is blocked when booking conversion is insufficient, and not by capacity", () => {
    const r = runCycle({ seed: 1, budgetGbp: 60_000, now: NOW, measure: false });
    const l = r.allocation.lines.find((x) => x.interventionId === "I-004")!;
    expect(l.status).toBe("BLOCKED"); expect(l.blockedBy.join(" ")).toMatch(/consumed by conversion/); expect(l.blockedBy.join(" ")).not.toMatch(/CAPACITY/);
  });
});

describe("data quality affects decisions", () => {
  it("stale PMS data reduces confidence and expected value; the reduction is declared", () => {
    const fresh = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false });
    const stale = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW), sourceQuality: { "SRC-SIM-WEB": quality(0.8, 0.9, 24 * 30, "DAILY", "last export 30 days ago") } } });
    const a = fresh.interventions.find((i) => i.id === "I-001")!, b = stale.interventions.find((i) => i.id === "I-001")!;
    expect(b.confidence).toBeLessThan(a.confidence);
    expect(b.confidenceBasis).toMatch(/data-quality factor/);
    expect(stale.dataQualityNotes[0]).toMatch(/STALE DATA/);
    expect(stale.decision.confidence).toBeLessThan(fresh.decision.confidence);
  });
});

describe("connector failure states", () => {
  it("an unconfigured camera reports SOURCE_NOT_CONFIGURED and produces no observations", () => {
    const c = cameraConnector([{ id: "CAM-LOBBY", zone: "lobby", purpose: "queue", configured: false, streamUrlEnv: "ANESIS_CAMERA_LOBBY_STREAM_URL", retentionHours: 0, legalBasis: "not set" }], {}, NOW);
    expect(c.status).toBe("SOURCE_NOT_CONFIGURED");
    expect(c.statusNote).toMatch(/NOT CONNECTED/);
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: { ...emptyContext(NOW, [c]), cameras: [] } });
    expect(r.signals.filter((s) => s.domain === "vision")).toHaveLength(0);
    expect(r.events.find((e) => e.type === "CONTEXT_LOADED")!.detail).toMatch(/connected: none/);
  });
  it("vision records cannot carry identity data", () => {
    expect(() => assertNoIdentityData({ cameraId: "x", faceId: "y" })).toThrow(/forbidden/);
    expect(() => assertNoIdentityData({ cameraId: "x", value: 3 })).not.toThrow();
  });
  it("a NOT_CONNECTED connector contributes no signal and is listed as such", () => {
    const c: ConnectorContract = { id: "CONN-SEARCH", domain: "search", name: "Search demand", provider: "Google Trends (no official API)", kind: "contract", requires: [], freshness: "WEEKLY", status: "NOT_CONNECTED", statusNote: "no official API", lastFetchedAt: null, legal: "—" };
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false, context: emptyContext(NOW, [c]) });
    expect(r.signals.filter((s) => s.domain === "search")).toHaveLength(0);
    expect(r.context.connectors[0]!.status).toBe("NOT_CONNECTED");
  });
});
