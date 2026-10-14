/**
 * All fixtures here are SYNTHETIC, written for these tests. They are not data from any property and are never
 * presented as such; they exist to prove the reader's behaviour on clean, incomplete, contradictory and malformed files.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { importPmsExport, parseCsv, inferDateOrder, parseMoney, classifyChannel, classifyStatus } from "../index.js";
import { observationsFromSystems, runCycle, emptyContext, qualityFactor } from "@anesis/engine";

const T = "2026-10-14T09:00:00Z";
const CLEAN = `Reservation ID,Booking Date,Arrival,Departure,Status,Room Revenue,Currency,Channel
R1,2026-08-01,2026-09-01,2026-09-04,Confirmed,"£540.00",GBP,Booking.com
R2,2026-08-20,2026-09-02,2026-09-03,Checked out,180.00,GBP,Website
R3,2026-08-25,2026-09-03,2026-09-06,Confirmed,"£600.00",GBP,Expedia
R4,2026-08-28,2026-09-05,2026-09-07,Cancelled,360.00,GBP,Website
R5,2026-08-30,2026-09-06,2026-09-08,No show,350.00,GBP,Phone
R6,2026-09-01,2026-09-08,2026-09-10,Confirmed,400.00,GBP,Direct
R1,2026-08-01,2026-09-01,2026-09-04,Confirmed,"£540.00",GBP,Booking.com`;

describe("generic PMS export reader", () => {
  it("clean export: fields detected, duplicate removed, cancellation and no-show excluded, metrics computed with their basis", () => {
    const r = importPmsExport({ filename: "sim-clean.csv", content: CLEAN, rooms: 10, importedAt: T });
    expect(r.simulated).toBe(false); expect(r.provenance.sha256).toMatch(/^[0-9a-f]{64}$/); expect(r.provenance.format).toBe("csv");
    expect(r.fields.available).toEqual(expect.arrayContaining(["reservationId", "bookingDate", "arrival", "departure", "status", "revenue", "currency", "channel"]));
    expect(r.counts).toMatchObject({ rows: 7, kept: 4, cancelled: 1, noShows: 1, duplicates: 1 });
    expect(r.metrics.roomNightsSold).toBe(3 + 1 + 3 + 2);
    expect(r.metrics.roomRevenueGbp).toBeCloseTo(540 + 180 + 600 + 400);
    expect(r.metrics.adrGbp).toBeCloseTo(1720 / 9, 2);
    expect(r.period).toMatchObject({ from: "2026-09-01", to: "2026-09-10", days: 9 });
    expect(r.metrics.occupancy).toBeCloseTo(9 / (10 * 9), 4);
    expect(r.metrics.otaShare).toBeCloseTo(6 / 9, 4);
    expect(r.snapshot).not.toBeNull(); expect(r.snapshot!.otaCommissionGbp).toBeNull(); expect(r.snapshot!.cancellations).toBe(1); expect(r.snapshot!.noShows).toBe(1);
    expect(r.sufficiency.verdict).toBe("WINDOW_TOO_SHORT");   // every field is there, but 9 days establish nothing annual (C1)
    expect(r.sufficiency.canCompute).toEqual(expect.arrayContaining(["room nights", "occupancy", "ADR", "OTA share"]));
    expect(r.metrics.basis.occupancy).toMatch(/10 declared rooms/);
  });
  it("is deterministic: same bytes and options give the same result", () => {
    const a = importPmsExport({ filename: "sim-clean.csv", content: CLEAN, rooms: 10, importedAt: T }); const b = importPmsExport({ filename: "sim-clean.csv", content: CLEAN, rooms: 10, importedAt: T });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("French headers, semicolons, dd/mm dates and euro amounts without a rate: room nights known, revenue unknown, never zero", () => {
    const fr = `Numéro de réservation;Date d'arrivée;Date de départ;Statut;Montant total;Canal
A1;15/09/2026;18/09/2026;Confirmée;"1 234,50 €";Booking.com
A2;20/09/2026;21/09/2026;Annulée;"200,00 €";Site web
A3;22/09/2026;25/09/2026;Confirmée;"900,00 €";Téléphone`;
    const r = importPmsExport({ filename: "sim-fr.csv", content: fr, rooms: 8, importedAt: T });
    expect(r.provenance.delimiter).toBe(";"); expect(r.provenance.dateOrder).toBe("DMY");
    expect(r.metrics.roomNightsSold).toBe(6); expect(r.metrics.roomRevenueGbp).toBeNull(); expect(r.metrics.adrGbp).toBeNull();
    expect(r.snapshot!.roomRevenueGbp).toBeNull(); expect(r.sufficiency.verdict).toBe("WINDOW_TOO_SHORT"); expect(r.sufficiency.window.days).toBe(10);
    expect(r.sufficiency.cannotCompute.find((c) => c.metric === "ADR")?.because).toMatch(/currency without a declared GBP rate/);
    expect(r.sufficiency.nextData).toContain("declare the currency and a GBP rate, or export in GBP");
    const withFx = importPmsExport({ filename: "sim-fr.csv", content: fr, rooms: 8, importedAt: T, fxToGbp: { EUR: 0.85 } });
    expect(withFx.metrics.roomRevenueGbp).toBeCloseTo((1234.5 + 900) * 0.85, 2);
  });
  it("ambiguous dates are reported, not guessed", () => {
    const amb = `id,arrival,departure,status\nX1,03/04/2026,05/04/2026,confirmed\nX2,06/07/2026,08/07/2026,confirmed`;
    const r = importPmsExport({ filename: "sim-amb.csv", content: amb, rooms: 5, importedAt: T });
    expect(r.provenance.dateOrder).toBe("ambiguous"); expect(r.metrics.roomNightsSold).toBeNull(); expect(r.sufficiency.verdict).toBe("INSUFFICIENT");
    expect(r.issues.some((i) => i.kind === "AMBIGUOUS_DATE")).toBe(true); expect(r.sufficiency.nextData).toContain("declare the date format (day/month order)");
    const fixed = importPmsExport({ filename: "sim-amb.csv", content: amb, rooms: 5, importedAt: T, dateOrder: "DMY" }); expect(fixed.metrics.roomNightsSold).toBe(4);
  });
  it("modifications keep the latest version; conflicting stays without a modification date are flagged for review", () => {
    const mod = `Booking ref,Arrival,Departure,Status,Total,Currency,Last modified
M1,2026-09-01,2026-09-03,Confirmed,200,GBP,2026-08-01
M1,2026-09-01,2026-09-05,Confirmed,400,GBP,2026-08-15
C1,2026-09-10,2026-09-12,Confirmed,300,GBP,
C1,2026-09-20,2026-09-22,Confirmed,300,GBP,`;
    const r = importPmsExport({ filename: "sim-mod.csv", content: mod, rooms: 5, importedAt: T });
    expect(r.counts.modified).toBe(1); expect(r.counts.conflicting).toBe(1);
    expect(r.issues.find((i) => i.kind === "CONFLICTING_RESERVATION")?.effect).toMatch(/human review/);
    expect(r.metrics.roomNightsSold).toBe(4 + 2);
  });
  it("impossible and missing values exclude rows from the totals they would corrupt, and are listed", () => {
    const bad = `id,arrival,departure,status,revenue,currency,channel
B1,2026-09-05,2026-09-02,confirmed,100,GBP,Web
B2,,,confirmed,100,GBP,Web
B3,2026-09-01,2026-09-02,confirmed,abc,GBP,Web
B4,2026-09-01,2026-09-02,confirmed,-50,GBP,Web
B5,2026-09-01,2026-09-03,weird status,120,GBP,Some Tour Partner`;
    const r = importPmsExport({ filename: "sim-bad.csv", content: bad, rooms: 5, importedAt: T });
    const kinds = r.issues.map((i) => i.kind);
    expect(kinds).toEqual(expect.arrayContaining(["DEPARTURE_BEFORE_ARRIVAL", "MISSING_DATES", "UNREADABLE_VALUE", "NEGATIVE_REVENUE", "UNKNOWN_STATUS", "UNCLASSIFIED_CHANNEL"]));
    expect(r.metrics.roomNightsSold).toBe(1 + 1 + 2); expect(r.metrics.roomRevenueGbp).toBeNull();   // B3's revenue is unreadable: the total is unknown, not 70
    expect(r.metrics.otaShare).toBeNull();                                                          // 50 % of nights on an unclassified channel
  });
  it("a reservations-only export without rooms declared feeds no snapshot and says what is missing", () => {
    const r = importPmsExport({ filename: "sim-norooms.csv", content: CLEAN, importedAt: T });
    expect(r.snapshot).toBeNull(); expect(r.metrics.occupancy).toBeNull(); expect(r.sufficiency.nextData).toContain("declare the number of sellable rooms");
  });
  it("XLSX with Excel serial dates reads the same as CSV", () => {
    const wb = XLSX.utils.book_new();
    const serial = (iso: string) => Math.round((Date.parse(iso + "T00:00:00Z") / 86_400_000) + 25569);
    const ws = XLSX.utils.aoa_to_sheet([["Confirmation", "Check-in", "Check-out", "Status", "Amount", "Currency", "Source"], ["X1", serial("2026-09-01"), serial("2026-09-04"), "Confirmed", 540, "GBP", "Expedia"], ["X2", serial("2026-09-02"), serial("2026-09-03"), "Confirmed", 180, "GBP", "Direct"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Reservations");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    const r = importPmsExport({ filename: "sim.xlsx", content: bytes, rooms: 10, importedAt: T });
    expect(r.provenance.format).toBe("xlsx"); expect(r.provenance.sheet).toBe("Reservations"); expect(r.period.from).toBe("2026-09-01");
    expect(r.metrics.roomNightsSold).toBe(4); expect(r.metrics.roomRevenueGbp).toBe(720); expect(r.metrics.otaShare).toBeCloseTo(0.75);
  });
  it("C1 — a 9-day export is not a year: the reader says WINDOW_TOO_SHORT, the engine takes only the room count and the decision does not move", () => {
    const r = importPmsExport({ filename: "sim-clean.csv", content: CLEAN, rooms: 34, importedAt: T });
    expect(r.sufficiency.verdict).toBe("WINDOW_TOO_SHORT"); expect(r.sufficiency.window).toMatchObject({ days: 9, cls: "TOO_SHORT", minimumDays: 90 });
    expect(r.sufficiency.cannotCompute.some((c) => /annual/.test(c.metric))).toBe(true); expect(r.sufficiency.nextData.some((n) => /at least 90 days/.test(n))).toBe(true);
    expect(r.metrics.occupancy).toBeCloseTo(9 / (34 * 9), 4);                                   // the window figure stays, labelled as a window figure
    const obs = observationsFromSystems({ pms: r.snapshot! }, T);
    expect(obs.map((o) => o.metric)).toEqual(["rooms"]);                                           // nothing annualised, no window ratio passed off as annual
    const none = runCycle({ seed: 1, budgetGbp: 16_000, now: T, measure: false });
    const cycle = runCycle({ seed: 1, budgetGbp: 16_000, now: T, measure: false, context: { ...emptyContext(T), systems: { pms: r.snapshot! } } });
    expect(cycle.verifiedMetrics).toEqual(["rooms"]); expect(cycle.diagnosis.binding).toBe(none.diagnosis.binding);
    expect(cycle.dataQualityNotes.some((n) => /CONN-PMS: 9-day window is below the 90-day minimum/.test(n))).toBe(true);
    expect(cycle.events.some((e) => e.type === "DATA_WINDOW_LIMITED")).toBe(true);
  });
  it("C1 — synthetic seasonal year: a summer month projects a false year, a quarter is a flagged projection, a full year is observed", () => {
    // SYNTHETIC: 20 rooms, daily occupancy 0.9 in Jun–Sep, 0.35 otherwise; ADR £200 flat. One reservation per occupied room-night.
    const rows: string[] = ["id,arrival,departure,status,revenue,currency,channel"]; let k = 0;
    const start = Date.parse("2025-10-01T00:00:00Z");
    for (let d = 0; d < 365; d++) { const day = new Date(start + d * 86_400_000); const m = day.getUTCMonth(); const occ = m >= 5 && m <= 8 ? 0.9 : 0.35; const sold = Math.round(20 * occ); const a = day.toISOString().slice(0, 10), b = new Date(start + (d + 1) * 86_400_000).toISOString().slice(0, 10); for (let i = 0; i < sold; i++) rows.push(`S${++k},${a},${b},confirmed,200,GBP,${i % 2 ? "Booking.com" : "Website"}`); }
    const csv = rows.join("\n");
    const year = importPmsExport({ filename: "sim-year.csv", content: csv, rooms: 20, importedAt: T });
    const quarter = importPmsExport({ filename: "sim-year.csv", content: csv, rooms: 20, importedAt: T, period: { from: "2026-06-01", to: "2026-08-31" } });
    const month = importPmsExport({ filename: "sim-year.csv", content: csv, rooms: 20, importedAt: T, period: { from: "2026-07-01", to: "2026-07-31" } });
    expect(year.sufficiency.window.cls).toBe("FULL_YEAR"); expect(quarter.sufficiency.window.cls).toBe("PARTIAL_YEAR"); expect(month.sufficiency.window.cls).toBe("TOO_SHORT");
    const trueAnnualNights = year.metrics.roomNightsSold!;
    const oy = observationsFromSystems({ pms: year.snapshot! }, T), oq = observationsFromSystems({ pms: quarter.snapshot! }, T), om = observationsFromSystems({ pms: month.snapshot! }, T);
    const nights = (o: typeof oy) => o.find((x) => x.metric === "room_nights");
    expect(nights(oy)).toMatchObject({ status: "VERIFIED", value: trueAnnualNights });
    expect(nights(oq)!.status).toBe("MODELLED"); expect(nights(oq)!.value).toBeGreaterThan(trueAnnualNights * 1.3);   // the summer projection overstates the year: that is why it is MODELLED, not VERIFIED
    expect(nights(oq)!.assumptions.join(" ")).toMatch(/seasonal bias/); expect(oq.find((x) => x.metric === "occupancy")).toMatchObject({ status: "VERIFIED", confidence: 0.9 });
    expect(nights(om)).toBeUndefined(); expect(om.map((o) => o.metric)).toEqual(["rooms"]);
    const cy = runCycle({ seed: 1, budgetGbp: 16_000, now: T, measure: false, context: { ...emptyContext(T), systems: { pms: year.snapshot! } } });
    expect(cy.verifiedMetrics).toEqual(expect.arrayContaining(["room_nights", "occupancy", "adr", "room_revenue", "ota_share"])); expect(cy.dataQualityNotes.some((n) => /CONN-PMS/.test(n))).toBe(false);
    const cq = runCycle({ seed: 1, budgetGbp: 16_000, now: T, measure: false, context: { ...emptyContext(T), systems: { pms: quarter.snapshot! } } });
    expect(cq.verifiedMetrics).toEqual(expect.arrayContaining(["occupancy", "adr"])); expect(cq.verifiedMetrics).not.toContain("room_nights");
    expect(cq.dataQualityNotes.some((n) => /annual room nights, revenue, occupancy, ADR and channel mix are projections/.test(n))).toBe(true);
  });
  it("helpers: delimiter sniffing, money forms, channel and status vocabularies", () => {
    expect(parseCsv("a\tb\n1\t2").headers).toEqual(["a", "b"]);
    expect(parseMoney("£1,234.50").value).toBe(1234.5); expect(parseMoney("1 234,50 €")).toMatchObject({ value: 1234.5, currency: "EUR" }); expect(parseMoney("(120.00)").value).toBe(-120); expect(parseMoney("USD 99").currency).toBe("USD");
    expect(inferDateOrder(["01/02/2026", "13/02/2026"])).toBe("DMY"); expect(inferDateOrder(["02/13/2026"])).toBe("MDY");
    expect(classifyChannel("Booking.com")).toBe("OTA"); expect(classifyChannel("Site web")).toBe("DIRECT"); expect(classifyChannel("Tour operator")).toBe("OTHER"); expect(classifyChannel("Zorg")).toBe("UNCLASSIFIED");
    expect(classifyStatus("Annulée")).toBe("CANCELLED"); expect(classifyStatus("No-show")).toBe("NO_SHOW"); expect(classifyStatus("Checked out")).toBe("ACTIVE"); expect(classifyStatus("???")).toBe("UNKNOWN");
  });
});

/** C2 — freshness: a file is a historical record; the period end, the export date and the import date are kept apart. */
describe("C2 — three dates, historical never stale", () => {
  const year = (() => { const rows = ["id,arrival,departure,status,revenue,currency,channel"]; let k = 0; const start = Date.parse("2025-09-01T00:00:00Z"); for (let d = 0; d < 365; d++) { const a = new Date(start + d * 86_400_000).toISOString().slice(0, 10), b = new Date(start + (d + 1) * 86_400_000).toISOString().slice(0, 10); for (let i = 0; i < 10; i++) rows.push(`Y${++k},${a},${b},confirmed,150,GBP,Website`); } return rows.join("\n"); })();   // SYNTHETIC, 20 rooms at 50 %
  it("an export closed three weeks before import is not stale (the audit's probe): quality keeps its factor, the statement dates the period", () => {
    const r = importPmsExport({ filename: "sim-old.csv", content: year, rooms: 20, importedAt: "2026-09-21T09:00:00Z" });
    expect(r.period.to).toBe("2026-09-01"); expect(r.quality.expectedFreshness).toBe("HISTORICAL"); expect(r.quality.stale).toBe(false);
    expect(qualityFactor(r.quality)).toBeCloseTo(r.quality.completeness * 0.9, 6); expect(r.quality.ageHours).toBeCloseTo(20 * 24 + 9, 1);
    expect(r.recency).toMatchObject({ periodEnd: "2026-09-01", collectedAt: null, daysPeriodEndToCollection: null, daysPeriodEndToImport: 20 });
    expect(r.recency.statement).toMatch(/period ending 2026-09-01, export date not declared, imported 20 day\(s\) after the period end; a historical record/);
    const cycle = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-09-21T09:00:00Z", measure: false, context: { ...emptyContext("2026-09-21T09:00:00Z"), systems: { pms: r.snapshot! }, sourceQuality: { "CONN-PMS": r.quality } } });
    expect(cycle.dataQualityNotes.some((n) => /STALE/.test(n))).toBe(false);
    expect(cycle.requirements.every((q) => q.checks.every((c) => !/stale/.test(c.how)))).toBe(true);
  });
  it("a declared export date is used for the age and the statement; an export imported the day it closes reads as current", () => {
    const r = importPmsExport({ filename: "sim-old.csv", content: year, rooms: 20, importedAt: "2026-10-14T09:00:00Z", collectedAt: "2026-09-02T18:00:00Z" });
    expect(r.recency).toMatchObject({ collectedAt: "2026-09-02T18:00:00Z", daysPeriodEndToCollection: 2, daysPeriodEndToImport: 43 });
    expect(r.quality.ageHours).toBeCloseTo(42, 1); expect(r.provenance.collectedAt).toBe("2026-09-02T18:00:00Z"); expect(r.snapshot!.source).toMatch(/period to 2026-09-01; exported 2026-09-02T18:00:00Z; imported 2026-10-14/);
    const fresh = importPmsExport({ filename: "sim-old.csv", content: year, rooms: 20, importedAt: "2026-09-01T06:00:00Z" });
    expect(fresh.recency.daysPeriodEndToImport).toBe(0); expect(fresh.quality.stale).toBe(false);
  });
  it("missing metadata: no readable dates means no period end, no age, and a statement that says so rather than a guess", () => {
    const amb = `id,arrival,departure,status\nX1,03/04/2026,05/04/2026,confirmed\nX2,06/07/2026,08/07/2026,confirmed`;
    const r = importPmsExport({ filename: "sim-amb.csv", content: amb, rooms: 5, importedAt: T });
    expect(r.recency.periodEnd).toBeNull(); expect(r.quality.ageHours).toBeNull(); expect(r.quality.stale).toBe(false); expect(r.recency.statement).toMatch(/period end unknown/);
  });
});
