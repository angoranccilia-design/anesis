/**
 * REAL DATA → ENGINE. Typed snapshots from property systems are normalised into Observations with status VERIFIED and
 * override the simulated ones with the same metric. This is the single path a real connector (or a file import) takes;
 * the engine does not know or care whether a number came from an API, a CSV or the simulator — only its status says.
 *
 * Window rule (audit finding C1). A snapshot covers a window of `periodDays`. What that window can establish depends
 * on its length, and this module is where the distinction is made, metric by metric:
 *   - FULL_YEAR (≥ 365 days): annual totals are observed (VERIFIED) and window ratios are annual ratios.
 *   - PARTIAL_YEAR (≥ ANNUALISATION_MIN_DAYS, < 365): annual totals are projections (status MODELLED, lower confidence,
 *     the seasonal bias named); window ratios are VERIFIED for the window and carry that caveat.
 *   - TOO_SHORT (< ANNUALISATION_MIN_DAYS): nothing is annualised and no window ratio is passed off as an annual
 *     figure; only raw stocks (rooms, guest base) are emitted. The reason is returned by `systemsWindowNotes`.
 * The 90-day minimum is a judgement, not a guarantee: a quarter spans at least one seasonal transition in UK leisure
 * hospitality, which bounds (not removes) the bias of a projection. Only a full year removes it.
 */
import type { Observation, Status } from "../model.js";
import type { SystemSnapshots } from "./types.js";

export const ANNUALISATION_MIN_DAYS = 90;
export const FULL_YEAR_DAYS = 365;
export type WindowClass = "FULL_YEAR" | "PARTIAL_YEAR" | "TOO_SHORT";
export function classifyWindow(periodDays: number): WindowClass { return periodDays >= FULL_YEAR_DAYS ? "FULL_YEAR" : periodDays >= ANNUALISATION_MIN_DAYS ? "PARTIAL_YEAR" : "TOO_SHORT"; }

interface Window { readonly cls: WindowClass; readonly days: number; readonly annualise: boolean; readonly ratio: boolean; readonly status: Status; readonly confidence: number; readonly ratioConfidence: number; readonly assumptions: readonly string[]; readonly period: string }
function windowOf(periodDays: number): Window {
  const cls = classifyWindow(periodDays);
  if (cls === "FULL_YEAR") return { cls, days: periodDays, annualise: true, ratio: true, status: "VERIFIED", confidence: 0.98, ratioConfidence: 0.98, assumptions: [], period: `${periodDays}-day window (full year observed)` };
  if (cls === "PARTIAL_YEAR") return { cls, days: periodDays, annualise: true, ratio: true, status: "MODELLED", confidence: 0.85, ratioConfidence: 0.9, assumptions: [`projection from a ${periodDays}-day window: × 365 ÷ ${periodDays}; seasonal bias possible until a full year is observed`], period: `${periodDays}-day window (partial year; annual totals are projections)` };
  return { cls, days: periodDays, annualise: false, ratio: false, status: "VERIFIED", confidence: 0.98, ratioConfidence: 0.98, assumptions: [], period: `${periodDays}-day window (below the ${ANNUALISATION_MIN_DAYS}-day minimum: not annualised, not used as an annual rate)` };
}

export function observationsFromSystems(sys: SystemSnapshots, nowIso: string): Observation[] {
  const out: Observation[] = []; let n = 0;
  const add = (metric: string, value: number, unit: string, source: string, transformation: string, asOf: string, w: Window, kind: "raw" | "ratio" | "annual", evidence: string[] = [], extra: string[] = []) => {
    const id = `OBV-${String(++n).padStart(3, "0")}`;
    const status: Status = kind === "annual" ? w.status : "VERIFIED";
    const confidence = kind === "annual" ? w.confidence : kind === "ratio" ? w.ratioConfidence : 0.98;
    const assumptions = kind === "raw" ? extra : [...w.assumptions, ...extra];
    out.push({ id, metric, value, unit, period: kind === "raw" ? "stock at as-of date" : w.period, source, timestamp: asOf, transformation, assumptions, confidence, status, evidence }); return id;
  };
  const p = sys.pms;
  if (p) {
    const w = windowOf(p.periodDays); const yr = FULL_YEAR_DAYS / p.periodDays;
    const rooms = add("rooms", p.rooms, "rooms", "CONN-PMS", "raw", p.asOf, w, "raw");
    if (w.annualise) {
      const rn = add("room_nights", p.roomNightsSold * yr, "nights/year", "CONN-PMS", `room nights sold × 365 ÷ ${p.periodDays} period days${w.cls === "PARTIAL_YEAR" ? " (projection)" : ""}`, p.asOf, w, "annual", [rooms]);
      if (p.roomRevenueGbp !== null) add("room_revenue", p.roomRevenueGbp * yr, "GBP/year", "CONN-PMS", `room revenue × 365 ÷ ${p.periodDays} period days${w.cls === "PARTIAL_YEAR" ? " (projection)" : ""}`, p.asOf, w, "annual", [rn]);
    }
    if (w.ratio) {
      add("occupancy", p.roomNightsSold / (p.rooms * p.periodDays), "ratio", "CONN-PMS", "room nights ÷ (rooms × period days)", p.asOf, w, "ratio", [rooms]);
      // Absent fields are null and produce no observation: the simulated or declared value stays, flagged as such, and the
      // data-requirements check reports what is missing. Nothing below treats "unknown" as zero.
      if (p.roomRevenueGbp !== null) {
        const adr = add("adr", p.roomRevenueGbp / Math.max(1, p.roomNightsSold), "GBP/night", "CONN-PMS", "room revenue ÷ occupied room nights", p.asOf, w, "ratio");
        if (p.avgStayNights) { const id = `OBV-${String(++n).padStart(3, "0")}`; out.push({ id, metric: "booking_value_avg", value: (p.roomRevenueGbp / Math.max(1, p.roomNightsSold)) * p.avgStayNights, unit: "GBP", period: w.period, source: "CONN-PMS", timestamp: p.asOf, transformation: `adr × average stay (${p.avgStayNights.toFixed(2)} nights, from the reservations)`, assumptions: [...w.assumptions], confidence: w.ratioConfidence, status: "MODELLED", evidence: [adr] }); }
        if (p.otaCommissionGbp !== null && p.otaRoomNights !== null) add("ota_commission_rate", p.otaCommissionGbp / Math.max(1, p.otaRoomNights * (p.roomRevenueGbp / Math.max(1, p.roomNightsSold))), "ratio", "CONN-PMS", "commission paid ÷ OTA room revenue", p.asOf, w, "ratio");
      }
      if (p.otaRoomNights !== null) add("ota_share", p.otaRoomNights / Math.max(1, p.roomNightsSold), "ratio", "CONN-PMS", "OTA room nights ÷ room nights", p.asOf, w, "ratio");
      if (p.cancellations !== null) add("cancellation_rate", p.cancellations / Math.max(1, p.roomNightsSold + p.cancellations), "ratio", "CONN-PMS", "cancellations ÷ (sold + cancelled)", p.asOf, w, "ratio");
      if (p.peakOccupancy !== null) add("ops.peak_occupancy", p.peakOccupancy, "ratio", "CONN-PMS", "raw", p.asOf, w, "ratio");
    }
  }
  const b = sys.bookingEngine;
  if (b) { const w = windowOf(b.periodDays); if (w.ratio) { add("conv.mobile", b.mobileConversion, "ratio", "CONN-BOOKING-ENGINE", "mobile bookings ÷ mobile sessions", b.asOf, w, "ratio"); add("conv.desktop", b.desktopConversion, "ratio", "CONN-BOOKING-ENGINE", "desktop bookings ÷ desktop sessions", b.asOf, w, "ratio"); add("funnel.abandonment", 1 - b.bookings / Math.max(1, b.bookingStarts), "ratio", "CONN-BOOKING-ENGINE", "1 − bookings ÷ booking starts", b.asOf, w, "ratio"); } }
  const g = sys.analytics;
  if (g) { const w = windowOf(g.periodDays); if (w.annualise) add("sessions.total", g.sessions * FULL_YEAR_DAYS / g.periodDays, "sessions/year", "CONN-GA4", `sessions × 365 ÷ ${g.periodDays} period days${w.cls === "PARTIAL_YEAR" ? " (projection)" : ""}`, g.asOf, w, "annual"); if (w.ratio) { add("sessions.mobile_share", g.mobileShare, "ratio", "CONN-GA4", "raw", g.asOf, w, "ratio"); if (g.pageSpeedMobileMs !== null) add("page_speed_mobile_ms", g.pageSpeedMobileMs, "ms", "CONN-GA4", "raw", g.asOf, w, "ratio"); } }
  for (const a of sys.ads ?? []) { const w = windowOf(a.periodDays); if (w.annualise) add(a.channel === "meta" ? "ads.meta_spend" : "ads.google_spend", a.spendGbp * FULL_YEAR_DAYS / a.periodDays, "GBP/year", a.channel === "meta" ? "CONN-META-ADS" : "CONN-GOOGLE-ADS", `spend × 365 ÷ ${a.periodDays} period days${w.cls === "PARTIAL_YEAR" ? " (projection)" : ""}`, a.asOf, w, "annual", [], [`attribution model: ${a.attributionModel}`]); }
  const c = sys.crm;
  if (c) { const w = windowOf(FULL_YEAR_DAYS); add("crm.past_guests", c.pastGuests, "guests", "CONN-CRM", "raw", c.asOf, w, "raw"); add("crm.repeat_rate", c.repeatRate, "ratio", "CONN-CRM", "raw", c.asOf, w, "ratio", [], [`${(c.consentedShare * 100).toFixed(0)} % consented`]); if (c.emailOpenRate !== null) add("crm.email_open_rate", c.emailOpenRate, "ratio", "CONN-CRM", "raw", c.asOf, w, "ratio"); }
  return out;
}

/** What each windowed system can and cannot establish, for the cycle's data-quality notes. Empty when every window is a full year. */
export function systemsWindowNotes(sys: SystemSnapshots): string[] {
  const notes: string[] = [];
  const say = (id: string, days: number, what: string) => {
    const cls = classifyWindow(days);
    if (cls === "TOO_SHORT") notes.push(`${id}: ${days}-day window is below the ${ANNUALISATION_MIN_DAYS}-day minimum — ${what} not annualised and not used as annual rates; only raw stocks taken; the declared or simulated values remain for the rest`);
    else if (cls === "PARTIAL_YEAR") notes.push(`${id}: ${days}-day window — annual ${what} are projections (× 365 ÷ ${days}), status MODELLED; seasonal bias possible until a full year is observed`);
  };
  if (sys.pms) say("CONN-PMS", sys.pms.periodDays, "room nights, revenue, occupancy, ADR and channel mix");
  if (sys.bookingEngine) say("CONN-BOOKING-ENGINE", sys.bookingEngine.periodDays, "conversion rates");
  if (sys.analytics) say("CONN-GA4", sys.analytics.periodDays, "sessions");
  for (const a of sys.ads ?? []) say(a.channel === "meta" ? "CONN-META-ADS" : "CONN-GOOGLE-ADS", a.periodDays, "spend");
  return notes;
}

/** Overrides simulated observations with verified ones of the same metric; keeps the rest. Returns the merged list and what was replaced. */
export function mergeObservations(simulated: readonly Observation[], verified: readonly Observation[]): { observations: Observation[]; replaced: string[] } {
  const byMetric = new Map(verified.map((o) => [o.metric, o]));
  const replaced: string[] = [];
  const observations = simulated.map((o) => { const v = byMetric.get(o.metric); if (!v) return o; replaced.push(o.metric); return { ...v, id: o.id }; });
  return { observations, replaced };
}
