/**
 * All fixtures here are SYNTHETIC, written for these tests. They are not data from any property and are never
 * presented as such; they exist to prove the reader's behaviour on clean, incomplete, contradictory and malformed files.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { importPmsExport, parseCsv, inferDateOrder, parseMoney, classifyChannel, classifyStatus } from "../index.js";
import { observationsFromSystems, runCycle, emptyContext } from "@anesis/engine";

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
    expect(r.sufficiency.verdict).toBe("SUFFICIENT_FOR_OCCUPANCY_AND_ADR");
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
    expect(r.snapshot!.roomRevenueGbp).toBeNull(); expect(r.sufficiency.verdict).toBe("PARTIAL");
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
  it("the snapshot feeds the existing engine: null fields produce no observation, present fields become VERIFIED and override the simulation", () => {
    const r = importPmsExport({ filename: "sim-clean.csv", content: CLEAN, rooms: 34, importedAt: T });
    const obs = observationsFromSystems({ pms: r.snapshot! }, T);
    const metrics = obs.map((o) => o.metric);
    expect(metrics).toEqual(expect.arrayContaining(["rooms", "room_nights", "occupancy", "adr", "room_revenue", "ota_share", "cancellation_rate"]));
    expect(metrics).not.toContain("ota_commission_rate"); expect(metrics).not.toContain("ops.peak_occupancy");
    expect(obs.every((o) => o.status === "VERIFIED")).toBe(true);
    const cycle = runCycle({ seed: 1, budgetGbp: 16_000, now: T, measure: false, context: { ...emptyContext(T), systems: { pms: r.snapshot! } } });
    expect(cycle.verifiedMetrics).toEqual(expect.arrayContaining(["occupancy", "adr", "ota_share"]));
    expect(cycle.verifiedMetrics).not.toContain("ops.peak_occupancy");
    expect(cycle.diagnosis.binding).toBeTruthy();
  });
  it("helpers: delimiter sniffing, money forms, channel and status vocabularies", () => {
    expect(parseCsv("a\tb\n1\t2").headers).toEqual(["a", "b"]);
    expect(parseMoney("£1,234.50").value).toBe(1234.5); expect(parseMoney("1 234,50 €")).toMatchObject({ value: 1234.5, currency: "EUR" }); expect(parseMoney("(120.00)").value).toBe(-120); expect(parseMoney("USD 99").currency).toBe("USD");
    expect(inferDateOrder(["01/02/2026", "13/02/2026"])).toBe("DMY"); expect(inferDateOrder(["02/13/2026"])).toBe("MDY");
    expect(classifyChannel("Booking.com")).toBe("OTA"); expect(classifyChannel("Site web")).toBe("DIRECT"); expect(classifyChannel("Tour operator")).toBe("OTHER"); expect(classifyChannel("Zorg")).toBe("UNCLASSIFIED");
    expect(classifyStatus("Annulée")).toBe("CANCELLED"); expect(classifyStatus("No-show")).toBe("NO_SHOW"); expect(classifyStatus("Checked out")).toBe("ACTIVE"); expect(classifyStatus("???")).toBe("UNKNOWN");
  });
});
