/**
 * REAL DATA → ENGINE. Typed snapshots from property systems are normalised into Observations with status VERIFIED and
 * override the simulated ones with the same metric. This is the single path a real connector (or a file import) takes;
 * the engine does not know or care whether a number came from an API, a CSV or the simulator — only its status says.
 */
import type { Observation } from "../model.js";
import type { SystemSnapshots } from "./types.js";

export function observationsFromSystems(sys: SystemSnapshots, nowIso: string): Observation[] {
  const out: Observation[] = []; let n = 0;
  const add = (metric: string, value: number, unit: string, source: string, transformation: string, asOf: string, assumptions: string[] = [], evidence: string[] = []) => { const id = `OBV-${String(++n).padStart(3, "0")}`; out.push({ id, metric, value, unit, period: `last ${(sys.pms?.periodDays ?? sys.bookingEngine?.periodDays ?? 30)} days, annualised where stated`, source, timestamp: asOf, transformation, assumptions, confidence: 0.98, status: "VERIFIED", evidence }); return id; };
  const p = sys.pms;
  if (p) {
    const yr = 365 / p.periodDays;
    const rooms = add("rooms", p.rooms, "rooms", "CONN-PMS", "raw", p.asOf);
    const rn = add("room_nights", p.roomNightsSold * yr, "nights/year", "CONN-PMS", "room nights sold × 365 ÷ period days", p.asOf, [], [rooms]);
    add("occupancy", p.roomNightsSold / (p.rooms * p.periodDays), "ratio", "CONN-PMS", "room nights ÷ (rooms × period days)", p.asOf, [], [rooms, rn]);
    add("adr", p.roomRevenueGbp / Math.max(1, p.roomNightsSold), "GBP/night", "CONN-PMS", "room revenue ÷ occupied room nights", p.asOf);
    const rev = add("room_revenue", p.roomRevenueGbp * yr, "GBP/year", "CONN-PMS", "room revenue × 365 ÷ period days", p.asOf);
    add("ota_share", p.otaRoomNights / Math.max(1, p.roomNightsSold), "ratio", "CONN-PMS", "OTA room nights ÷ room nights", p.asOf);
    add("ota_commission_rate", p.otaCommissionGbp / Math.max(1, p.otaRoomNights * (p.roomRevenueGbp / Math.max(1, p.roomNightsSold))), "ratio", "CONN-PMS", "commission paid ÷ OTA room revenue", p.asOf, [], [rev]);
    add("cancellation_rate", p.cancellations / Math.max(1, p.roomNightsSold + p.cancellations), "ratio", "CONN-PMS", "cancellations ÷ (sold + cancelled)", p.asOf);
    add("ops.peak_occupancy", p.peakOccupancy, "ratio", "CONN-PMS", "raw", p.asOf);
  }
  const b = sys.bookingEngine;
  if (b) { add("conv.mobile", b.mobileConversion, "ratio", "CONN-BOOKING-ENGINE", "mobile bookings ÷ mobile sessions", b.asOf); add("conv.desktop", b.desktopConversion, "ratio", "CONN-BOOKING-ENGINE", "desktop bookings ÷ desktop sessions", b.asOf); add("funnel.abandonment", 1 - b.bookings / Math.max(1, b.bookingStarts), "ratio", "CONN-BOOKING-ENGINE", "1 − bookings ÷ booking starts", b.asOf); }
  const g = sys.analytics;
  if (g) { add("sessions.total", g.sessions * 365 / g.periodDays, "sessions/year", "CONN-GA4", "sessions × 365 ÷ period days", g.asOf); add("sessions.mobile_share", g.mobileShare, "ratio", "CONN-GA4", "raw", g.asOf); if (g.pageSpeedMobileMs !== null) add("page_speed_mobile_ms", g.pageSpeedMobileMs, "ms", "CONN-GA4", "raw", g.asOf); }
  for (const a of sys.ads ?? []) { const yr = 365 / a.periodDays; add(a.channel === "meta" ? "ads.meta_spend" : "ads.google_spend", a.spendGbp * yr, "GBP/year", a.channel === "meta" ? "CONN-META-ADS" : "CONN-GOOGLE-ADS", "spend × 365 ÷ period days", a.asOf, [`attribution model: ${a.attributionModel}`]); }
  const c = sys.crm;
  if (c) { add("crm.past_guests", c.pastGuests, "guests", "CONN-CRM", "raw", c.asOf); add("crm.repeat_rate", c.repeatRate, "ratio", "CONN-CRM", "raw", c.asOf, [`${(c.consentedShare * 100).toFixed(0)} % consented`]); if (c.emailOpenRate !== null) add("crm.email_open_rate", c.emailOpenRate, "ratio", "CONN-CRM", "raw", c.asOf); }
  return out;
}

/** Overrides simulated observations with verified ones of the same metric; keeps the rest. Returns the merged list and what was replaced. */
export function mergeObservations(simulated: readonly Observation[], verified: readonly Observation[]): { observations: Observation[]; replaced: string[] } {
  const byMetric = new Map(verified.map((o) => [o.metric, o]));
  const replaced: string[] = [];
  const observations = simulated.map((o) => { const v = byMetric.get(o.metric); if (!v) return o; replaced.push(o.metric); return { ...v, id: o.id }; });
  return { observations, replaced };
}
