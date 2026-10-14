import "server-only";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";
import type { Runtime, RuntimeHandle } from "../engine/runtimeDb";
import { DEMO_PROPERTY_ID } from "../demo";

/**
 * DEMO SEED — one synthetic property with a synthetic 18-month reservations export, pushed through the REAL pipeline
 * (import → verified_only cycles → contracts → a seeded intervention journey → measurement on the property's own history).
 * Every actor of the seeded journey is "Demo seed — synthetic journey". Nothing here is a real establishment.
 */
export const DEMO_SPEC: PropertySpec = { ...COUNTRY_HOUSE_34, id: DEMO_PROPERTY_ID, name: "Harbourline House (DEMO — synthetic data)", type: "hotel", rooms: 40, location: { name: "Dorset coast (demo location)", lat: 50.72, lon: -1.98, country: "GB" } };
const SEED_ACTOR = (at: string) => ({ by: "Demo seed — synthetic journey", human: true, at });

/** 40 rooms; occupancy 0.85 Jun–Sep, 0.6 shoulder, 0.42 winter; ADR £230 summer / £185 otherwise; two thirds of stays via Booking.com at 18 %; mixed stay lengths; 1 Apr 2025 → `to`. No effect of any intervention is injected. */
function syntheticExport(to: string): string {
  const rows = ["Reservation ID,Booking Date,Arrival,Departure,Status,Room Revenue,Currency,Channel,Commission"]; let k = 0;
  const start = Date.parse("2025-04-01T00:00:00Z"), end = Date.parse(to + "T00:00:00Z");
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let t = start; t < end; t += 86_400_000) {
    const day = new Date(t); const m = day.getUTCMonth(); const occ = m >= 5 && m <= 8 ? 0.85 : m === 3 || m === 4 || m === 9 ? 0.6 : 0.42; const adr = m >= 5 && m <= 8 ? 230 : 185;
    const sold = Math.round(40 * occ * (0.9 + 0.2 * rnd()));
    for (let i = 0; i < sold; i++) {
      const nights = rnd() < 0.55 ? 1 : rnd() < 0.7 ? 2 : 3; const a = day.toISOString().slice(0, 10), b = new Date(t + nights * 86_400_000).toISOString().slice(0, 10);
      const booked = new Date(t - Math.round(5 + rnd() * 40) * 86_400_000).toISOString().slice(0, 10);
      const rev = adr * nights * (0.92 + 0.16 * rnd()); const ota = rnd() < 0.66; const status = rnd() < 0.05 ? "Cancelled" : "Confirmed";
      rows.push(`D${++k},${booked},${a},${b},${status},${rev.toFixed(2)},GBP,${ota ? "Booking.com" : "Website"},${ota ? (rev * 0.18).toFixed(2) : "0"}`);
    }
  }
  return rows.join("\n");
}

export async function ensureDemoSeed(rt: Runtime, db: RuntimeHandle["db"]): Promise<void> {
  if (await rt.loadProperty(db, DEMO_PROPERTY_ID)) return;
  await rt.upsertProperty(db, DEMO_SPEC);
  const dir = mkdtempSync(join(tmpdir(), "anesis-demo-"));
  const file1 = join(dir, "harbourline-reservations-2025-04-to-2026-05.csv"); writeFileSync(file1, syntheticExport("2026-06-01"));
  await rt.importFile(db, file1, { propertyId: DEMO_PROPERTY_ID, rooms: 40, importedAt: "2026-06-01T09:00:00.000Z", collectedAt: "2026-05-31T22:00:00.000Z" });
  await rt.saveRegisters(db, DEMO_PROPERTY_ID, {
    benchmarks: { "ota_share.target": { value: 0.35, source: "DEMO placeholder — to be replaced by a documented benchmark", asOf: "2026-01-01" }, "ota.shiftable.low": { value: 0.15, source: "DEMO placeholder", asOf: "2026-01-01" }, "ota.shiftable.high": { value: 0.35, source: "DEMO placeholder", asOf: "2026-01-01" } },
    events: [{ id: "EV-DEMO-1", name: "Coastal food festival (demo event)", start: "2026-10-24", end: "2026-10-25", venue: "harbour (demo)", distanceKm: 2, expectedAttendance: 8000, category: "festival", enteredBy: "operator", source: "operator register (demo)", evidenceNote: "demo entry, not a real event" } as never],
  });
  const T1 = "2026-06-01T09:00:00.000Z";
  await rt.scheduleCycle(db, DEMO_PROPERTY_ID, T1, 7); await rt.runOnce(db, { offline: true, now: () => T1 });
  await rt.saveRegisters(db, DEMO_PROPERTY_ID, { informationObtained: { "I-002": { study: "OTA vs direct price-parity study", source: "DEMO study report (synthetic), 5 June 2026", asOf: "2026-06-05", note: "parity gaps on 3 of 5 channels (demo)" } } });
  const T2 = "2026-06-08T09:00:00.000Z"; await db.query("update runtime_jobs set run_at = $1 where state = 'queued' and key like $2", [T2, `cycle:${DEMO_PROPERTY_ID}:%`]); await rt.runOnce(db, { offline: true, now: () => T2 });
  const id = "INT-RUN-002-I-002";
  if (await rt.loadIntervention(db, id)) {
    try {
      await rt.transitionIntervention(db, id, { to: "SUBMITTED", actor: { by: "engine", human: false, at: T2 } });
      await rt.transitionIntervention(db, id, { to: "AUTHORISED", actor: SEED_ACTOR("2026-06-10T10:00:00.000Z"), approvedAmountGbp: 4_000, note: "demo authorisation (synthetic journey)" });
      await rt.transitionIntervention(db, id, { to: "IN_EXECUTION", actor: SEED_ACTOR("2026-06-12T10:00:00.000Z") });
      await rt.transitionIntervention(db, id, { to: "EXECUTED", actor: SEED_ACTOR("2026-06-15T10:00:00.000Z"), proofs: [{ kind: "ticket", reference: "DEMO-BE-77 (synthetic)", note: "booking-engine vendor ticket: member rate and parity" }], actualSpendGbp: 3_800 });
      const file2 = join(dir, "harbourline-reservations-2025-04-to-2026-09.csv"); writeFileSync(file2, syntheticExport("2026-10-01"));
      await rt.importFile(db, file2, { propertyId: DEMO_PROPERTY_ID, rooms: 40, importedAt: "2026-10-01T09:00:00.000Z", collectedAt: "2026-09-30T22:00:00.000Z" });
      await rt.measureIntervention(db, id, SEED_ACTOR("2026-08-20T10:00:00.000Z"), 8);
      await rt.transitionIntervention(db, id, { to: "CLOSED", actor: SEED_ACTOR("2026-08-21T10:00:00.000Z"), note: "demo closure (synthetic journey)" });
    } catch (e) { console.warn("demo seed: journey stopped early", e instanceof Error ? e.message : e); }
  }
  const T3 = new Date().toISOString(); await db.query("update runtime_jobs set run_at = $1 where state = 'queued' and key like $2", [T3, `cycle:${DEMO_PROPERTY_ID}:%`]); await rt.runOnce(db, { offline: true, now: () => T3 });
}
