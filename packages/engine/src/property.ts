/**
 * Simulated property — SIMULATED PROPERTY DATA, never presented as a real hotel.
 *
 * A PropertySpec is a small set of declared parameters. From it, `simulateProperty` derives a full,
 * internally coherent set of Observations (demand, website, booking, distribution, revenue, guest
 * lifecycle, marketing, capacity) plus 156 weeks of room-revenue history for the property and for
 * comparable properties. `checkConsistency` proves the coherence (identities hold to rounding).
 */
import type { Observation, Source } from "./model.js";
import { rng, type Rng } from "./rng.js";

export interface PropertySpec {
  readonly id: string;
  readonly name: string;
  readonly type: "hotel" | "country_house" | "resort" | "glamping" | "ecolodge" | "spa" | "wellness_retreat";
  readonly rooms: number;
  readonly adrGbp: number;
  readonly occupancy: number;            // annual average
  readonly otaShare: number;             // share of room nights
  readonly otaCommission: number;        // effective, programmes included
  readonly sessionsPerYear: number;
  readonly mobileShare: number;
  readonly convDesktop: number;
  readonly convMobile: number;
  readonly pastGuests: number;
  readonly repeatRate: number;
  readonly reviewScore: number;          // 0..5
  readonly lowSeasonWeeks: number;
  readonly lowSeasonOcc: number;
  readonly metaSpendGbp: number;
  readonly googleSpendGbp: number;
  readonly ownerPlan: string | null;     // intervention id the owner would fund anyway
  readonly location: { readonly name: string; readonly lat: number; readonly lon: number; readonly country: string };
  readonly peakOccupancy: number;        // occupancy on peak nights (capacity)
  readonly staffingCoverage: number;     // staffed hours ÷ planned hours (operational)
  readonly weekendShare: number;         // share of room nights on Fri/Sat
  readonly roomsOutOfOrder: number;
}

export const COUNTRY_HOUSE_34: PropertySpec = {
  id: "PROP-SIM-001", name: "Ashcombe House (simulated)", type: "country_house",
  rooms: 34, adrGbp: 192, occupancy: 0.68, otaShare: 0.47, otaCommission: 0.19,
  sessionsPerYear: 118_000, mobileShare: 0.63, convDesktop: 0.021, convMobile: 0.0068,
  pastGuests: 9_400, repeatRate: 0.09, reviewScore: 4.3, lowSeasonWeeks: 18, lowSeasonOcc: 0.39,
  metaSpendGbp: 14_400, googleSpendGbp: 9_600, ownerPlan: "I-004",
  location: { name: "Cotswolds (simulated location)", lat: 51.83, lon: -1.85, country: "GB" },
  peakOccupancy: 0.86, staffingCoverage: 0.95, weekendShare: 0.58, roomsOutOfOrder: 1,
};

export const SOURCES: readonly Source[] = [
  { id: "SRC-SIM-PMS", name: "Simulated PMS export", kind: "simulation", note: "Rooms, occupancy, ADR, room revenue, channel mix. Generated from PropertySpec." },
  { id: "SRC-SIM-WEB", name: "Simulated web analytics", kind: "simulation", note: "Sessions by device, conversion, funnel. Generated from PropertySpec." },
  { id: "SRC-SIM-CRM", name: "Simulated CRM", kind: "simulation", note: "Past guests, repeat rate, engagement." },
  { id: "SRC-SIM-ADS", name: "Simulated ad platforms", kind: "simulation", note: "Meta and Google spend, clicks, conversions." },
  { id: "SRC-SIM-COMPS", name: "Simulated comparable properties", kind: "simulation", note: "Weekly room revenue of 10 comparables, sharing market and regional shocks." },
  { id: "SRC-BENCH", name: "Declared benchmarks", kind: "benchmark", note: "PLACEHOLDER values. To be replaced by documented sources before any real use." },
  { id: "SRC-DERIVED", name: "Engine derivation", kind: "derived", note: "Computed by a stated formula from upstream observations." },
];

export const WEEKS_PRE = 104;
export const WEEKS_POST = 52;
export const N_COMPARABLES = 10;

export interface Series { readonly property: readonly number[]; readonly comparables: readonly (readonly number[])[]; }

export interface SimulatedProperty {
  readonly spec: PropertySpec;
  readonly observations: readonly Observation[];
  readonly series: Series;              // 156 weeks: 104 pre, 52 post (post has NO effect applied yet)
  readonly generatedAt: string;
  readonly seed: number;
}

const season = (t: number): number => 1 + 0.45 * Math.sin((2 * Math.PI * (t - 14)) / 52) + 0.10 * Math.cos((4 * Math.PI * t) / 52);

function weeklySeries(r: Rng, weeklyBase: number, noise: number, T: number): { property: number[]; comparables: number[][]; } {
  const t = Array.from({ length: T }, (_, i) => i);
  // shared market: slow drift + weekly shocks (weather, events)
  let drift = 0; const raw = t.map(() => { drift += r.normal(0, 0.02); return Math.exp(drift) * (1 + r.normal(0, 0.04)); });
  // normalise so the pre-period market level averages 1: the declared annual revenue is the pre-period mean
  const preMean = raw.slice(0, WEEKS_PRE).reduce((a, b) => a + b, 0) / WEEKS_PRE;
  const market = raw.map((m) => m / preMean);
  const region = t.map(() => 1 + r.normal(0, 0.05));
  const gen = (base: number, inRegion: boolean): number[] => {
    const amp = r.uniform(0.7, 1.3); let e = 0;
    return t.map((w) => {
      e = 0.5 * e + r.normal(0, noise * Math.sqrt(0.75));
      return base * (1 + amp * (season(w) - 1)) * (market[w] ?? 1) * (inRegion ? (region[w] ?? 1) : 1) * Math.exp(e);
    });
  };
  const property = gen(weeklyBase, true);
  const comparables = Array.from({ length: N_COMPARABLES }, () => gen(r.uniform(15_000, 60_000), r.next() < 0.5));
  return { property, comparables };
}

export function simulateProperty(spec: PropertySpec = COUNTRY_HOUSE_34, seed = 1, now = new Date().toISOString()): SimulatedProperty {
  const r = rng(seed);
  const obs: Observation[] = [];
  let n = 0;
  const add = (metric: string, value: number, unit: string, source: string, o: Partial<Observation> = {}): string => {
    const id = `OBS-${String(++n).padStart(3, "0")}`;
    obs.push({ id, metric, value, unit, period: "annual", source, timestamp: now, transformation: "raw (simulated)",
      assumptions: [], confidence: 0.95, status: "SIMULATED", evidence: [], ...o });
    return id;
  };
  const s = spec;
  const roomNights = s.rooms * 365 * s.occupancy;
  const roomRevenue = roomNights * s.adrGbp;
  const avgStay = 1.9; const bookingValue = s.adrGbp * avgStay;
  const bookings = roomNights / avgStay;
  const otaRoomNights = roomNights * s.otaShare;
  const mobileSessions = s.sessionsPerYear * s.mobileShare;
  const desktopSessions = s.sessionsPerYear - mobileSessions;
  const directBookingsWeb = mobileSessions * s.convMobile + desktopSessions * s.convDesktop;
  const directBookings = bookings * (1 - s.otaShare);
  // funnel: searches → availability checks → booking starts → completions (web direct)
  const searches = s.sessionsPerYear * 0.42, avail = searches * 0.55, starts = avail * 0.31;
  const abandonment = 1 - directBookingsWeb / starts;
  const clicks = (s.metaSpendGbp / 0.85) + (s.googleSpendGbp / 1.6);
  const paidConv = clicks * 0.011;

  // capacity & revenue
  add("rooms", s.rooms, "rooms", "SRC-SIM-PMS");
  add("occupancy", s.occupancy, "ratio", "SRC-SIM-PMS");
  add("adr", s.adrGbp, "GBP/night", "SRC-SIM-PMS");
  add("room_nights", roomNights, "nights/year", "SRC-SIM-PMS", { transformation: "rooms × 365 × occupancy", status: "MODELLED", evidence: ["OBS-001", "OBS-002"] });
  add("room_revenue", roomRevenue, "GBP/year", "SRC-SIM-PMS", { transformation: "room_nights × adr", status: "MODELLED", evidence: ["OBS-004", "OBS-003"] });
  add("revpar", roomRevenue / (s.rooms * 365), "GBP/available night", "SRC-DERIVED", { transformation: "room_revenue ÷ (rooms × 365)", status: "MODELLED", evidence: ["OBS-005"] });
  add("ancillary_revenue", roomRevenue * 0.22, "GBP/year", "SRC-SIM-PMS", { assumptions: ["ancillary = 22 % of room revenue (simulation)"] });
  // distribution
  add("ota_share", s.otaShare, "ratio", "SRC-SIM-PMS");
  add("ota_commission_rate", s.otaCommission, "ratio", "SRC-SIM-PMS", { assumptions: ["effective rate incl. Genius/Booster-type programmes"] });
  add("ota_room_revenue", otaRoomNights * s.adrGbp, "GBP/year", "SRC-DERIVED", { transformation: "room_nights × ota_share × adr", status: "MODELLED", evidence: ["OBS-004", "OBS-008", "OBS-003"] });
  add("ota_commission_paid", otaRoomNights * s.adrGbp * s.otaCommission, "GBP/year", "SRC-DERIVED", { transformation: "ota_room_revenue × ota_commission_rate", status: "MODELLED", evidence: ["OBS-010", "OBS-009"] });
  add("direct_share", 1 - s.otaShare, "ratio", "SRC-DERIVED", { transformation: "1 − ota_share", status: "MODELLED", evidence: ["OBS-008"] });
  // demand & web
  add("sessions.total", s.sessionsPerYear, "sessions/year", "SRC-SIM-WEB");
  add("sessions.mobile_share", s.mobileShare, "ratio", "SRC-SIM-WEB");
  add("sessions.mobile", mobileSessions, "sessions/year", "SRC-DERIVED", { transformation: "sessions.total × mobile_share", status: "MODELLED", evidence: ["OBS-013", "OBS-014"] });
  add("sessions.desktop", desktopSessions, "sessions/year", "SRC-DERIVED", { transformation: "sessions.total − sessions.mobile", status: "MODELLED", evidence: ["OBS-013", "OBS-015"] });
  add("conv.desktop", s.convDesktop, "ratio", "SRC-SIM-WEB");
  add("conv.mobile", s.convMobile, "ratio", "SRC-SIM-WEB");
  add("page_speed_mobile_ms", 4_800, "ms", "SRC-SIM-WEB", { assumptions: ["simulated Lighthouse LCP on mobile"] });
  add("bounce_mobile", 0.61, "ratio", "SRC-SIM-WEB");
  add("funnel.searches", searches, "events/year", "SRC-SIM-WEB", { transformation: "sessions × 0.42", status: "MODELLED", evidence: ["OBS-013"], assumptions: ["42 % of sessions run a rate search (simulation)"] });
  add("funnel.availability_checks", avail, "events/year", "SRC-SIM-WEB", { transformation: "searches × 0.55", status: "MODELLED", evidence: ["OBS-021"] });
  add("funnel.booking_starts", starts, "events/year", "SRC-SIM-WEB", { transformation: "availability_checks × 0.31", status: "MODELLED", evidence: ["OBS-022"] });
  add("funnel.web_direct_bookings", directBookingsWeb, "bookings/year", "SRC-DERIVED", { transformation: "mobile × conv.mobile + desktop × conv.desktop", status: "MODELLED", evidence: ["OBS-015", "OBS-018", "OBS-016", "OBS-017"] });
  add("funnel.abandonment", abandonment, "ratio", "SRC-DERIVED", { transformation: "1 − web_direct_bookings ÷ booking_starts", status: "MODELLED", evidence: ["OBS-024", "OBS-023"] });
  add("bookings.total", bookings, "bookings/year", "SRC-DERIVED", { transformation: "room_nights ÷ avg_stay(1.9)", status: "MODELLED", evidence: ["OBS-004"], assumptions: ["average stay 1.9 nights"] });
  add("bookings.direct", directBookings, "bookings/year", "SRC-DERIVED", { transformation: "bookings.total × direct_share", status: "MODELLED", evidence: ["OBS-026", "OBS-012"] });
  add("booking_value_avg", bookingValue, "GBP", "SRC-DERIVED", { transformation: "adr × avg_stay", status: "MODELLED", evidence: ["OBS-003"] });
  // lifecycle
  add("crm.past_guests", s.pastGuests, "guests", "SRC-SIM-CRM");
  add("crm.repeat_rate", s.repeatRate, "ratio", "SRC-SIM-CRM");
  add("crm.email_open_rate", 0.31, "ratio", "SRC-SIM-CRM");
  add("cancellation_rate", 0.14, "ratio", "SRC-SIM-PMS");
  add("review_score", s.reviewScore, "score/5", "SRC-SIM-CRM");
  // marketing
  add("ads.meta_spend", s.metaSpendGbp, "GBP/year", "SRC-SIM-ADS");
  add("ads.google_spend", s.googleSpendGbp, "GBP/year", "SRC-SIM-ADS");
  add("ads.clicks", clicks, "clicks/year", "SRC-SIM-ADS", { transformation: "meta ÷ £0.85 CPC + google ÷ £1.60 CPC", status: "MODELLED", evidence: ["OBS-034", "OBS-035"] });
  add("ads.conversions", paidConv, "bookings/year", "SRC-SIM-ADS", { transformation: "clicks × 1.1 %", status: "MODELLED", evidence: ["OBS-036"] });
  add("ads.cac", (s.metaSpendGbp + s.googleSpendGbp) / paidConv, "GBP/booking", "SRC-DERIVED", { transformation: "(meta + google) ÷ ads.conversions", status: "MODELLED", evidence: ["OBS-034", "OBS-035", "OBS-037"] });
  // seasonality / capacity
  add("low_season_weeks", s.lowSeasonWeeks, "weeks", "SRC-SIM-PMS");
  add("low_season_occupancy", s.lowSeasonOcc, "ratio", "SRC-SIM-PMS");
  add("capacity.rooms_available_nights", s.rooms * 365, "nights/year", "SRC-DERIVED", { transformation: "rooms × 365", status: "MODELLED", evidence: ["OBS-001"] });
  add("ops.peak_occupancy", s.peakOccupancy, "ratio", "SRC-SIM-PMS", { assumptions: ["peak nights = Fri/Sat in high season"] });
  add("ops.staffing_coverage", s.staffingCoverage, "ratio", "SRC-SIM-PMS", { assumptions: ["staffed hours ÷ planned hours, last 4 weeks"] });
  add("ops.rooms_out_of_order", s.roomsOutOfOrder, "rooms", "SRC-SIM-PMS");
  add("weekend_share", s.weekendShare, "ratio", "SRC-SIM-PMS");

  const series = weeklySeries(r, roomRevenue / 52, 0.07, WEEKS_PRE + WEEKS_POST);
  return { spec, observations: obs, series, generatedAt: now, seed };
}

export function obsValue(p: SimulatedProperty, metric: string): { value: number; id: string } {
  const o = p.observations.find((x) => x.metric === metric);
  if (!o) throw new Error(`missing observation ${metric}`);
  return { value: o.value, id: o.id };
}

/** Identities that must hold; returns the list of violations (empty = coherent). */
export function checkConsistency(p: SimulatedProperty): string[] {
  const v = (m: string) => obsValue(p, m).value;
  const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  const out: string[] = [];
  if (!close(v("room_nights"), v("rooms") * 365 * v("occupancy"))) out.push("room_nights ≠ rooms × 365 × occupancy");
  if (!close(v("room_revenue"), v("room_nights") * v("adr"))) out.push("room_revenue ≠ room_nights × adr");
  if (!close(v("ota_commission_paid"), v("ota_room_revenue") * v("ota_commission_rate"))) out.push("commission ≠ ota revenue × rate");
  if (!close(v("direct_share") + v("ota_share"), 1)) out.push("direct_share + ota_share ≠ 1");
  if (!close(v("sessions.mobile") + v("sessions.desktop"), v("sessions.total"))) out.push("sessions do not add up");
  if (v("funnel.web_direct_bookings") > v("funnel.booking_starts")) out.push("more web bookings than booking starts");
  if (v("funnel.abandonment") < 0 || v("funnel.abandonment") > 1) out.push("abandonment out of [0,1]");
  if (v("bookings.direct") > v("bookings.total")) out.push("direct bookings exceed total bookings");
  if (v("occupancy") > 1 || v("low_season_occupancy") > v("occupancy")) out.push("occupancy inconsistent");
  if (v("ops.peak_occupancy") < v("occupancy") || v("ops.peak_occupancy") > 1) out.push("peak occupancy must lie between annual occupancy and 1");
  const pre = p.series.property.slice(0, WEEKS_PRE); const mean = pre.reduce((a, b) => a + b, 0) / pre.length;
  if (!close(mean, v("room_revenue") / 52, 0.15)) out.push("weekly series mean far from room_revenue/52");
  for (const o of p.observations) for (const e of o.evidence) if (!p.observations.some((x) => x.id === e)) out.push(`${o.id} cites missing evidence ${e}`);
  return out;
}
