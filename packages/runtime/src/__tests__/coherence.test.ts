/** Chantier C — one truth across imports, worker, console and memory. SYNTHETIC properties and files only. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs"; import { join } from "node:path"; import { tmpdir } from "node:os";
import { openDatabase, migrate, PgModelStore, runOnce, scheduleCycle, importFile, upsertProperty, loadProperty, listProperties, grantProperty, operatorMayAccess, propertiesOf, saveRegisters, loadRegisters, loadCycleResult, listCycleResults, listJobs, type SqlClient } from "../index.js";
import { COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";

let db: SqlClient;
const T1 = "2026-10-14T09:00:00.000Z", T2 = "2026-10-21T09:00:00.000Z";
const B: PropertySpec = { ...COUNTRY_HOUSE_34, id: "PROP-TEST-B", name: "Test B (synthetic)", rooms: 20, location: { name: "Test (synthetic)", lat: 51.5, lon: -0.1, country: "GB" } };
const csv = (rooms: number) => { const rows = ["id,arrival,departure,status,revenue,currency,channel"]; let k = 0; const start = Date.parse("2025-10-01T00:00:00Z"); for (let d = 0; d < 365; d++) { const a = new Date(start + d * 86_400_000).toISOString().slice(0, 10), b = new Date(start + (d + 1) * 86_400_000).toISOString().slice(0, 10); for (let i = 0; i < Math.round(rooms * 0.55); i++) rows.push(`S${++k},${a},${b},confirmed,140,GBP,${i % 3 ? "Booking.com" : "Website"}`); } return rows.join("\n"); };
beforeAll(async () => { db = await openDatabase({ databaseUrl: undefined, pgliteDir: undefined }); await migrate(db); });
afterAll(async () => { await db.close(); });

describe("C — properties, grants, registers, results", () => {
  it("a property must be declared before a job runs on it; the simulated one is built in and labelled", async () => {
    expect(await loadProperty(db, "PROP-NOPE")).toBeNull(); expect(await loadProperty(db, COUNTRY_HOUSE_34.id)).toEqual(COUNTRY_HOUSE_34);
    await scheduleCycle(db, "PROP-NOPE", T1, 7);
    const r = await runOnce(db, { offline: true, now: () => T1 }); expect(r.processed[0]?.outcome).toBe("retry");
    expect((await listJobs(db)).find((j) => j.key.includes("PROP-NOPE"))?.lastError).toMatch(/unknown property PROP-NOPE/);
    await db.query("update runtime_jobs set state = 'failed' where key like '%PROP-NOPE%'");
    await upsertProperty(db, B); expect((await listProperties(db)).map((p) => p.id)).toContain("PROP-TEST-B");
  });
  it("grants: an operator sees only granted properties", async () => {
    await grantProperty(db, "op-2", "PROP-TEST-B");
    expect(await operatorMayAccess(db, "op-2", "PROP-TEST-B")).toBe(true); expect(await operatorMayAccess(db, "op-2", COUNTRY_HOUSE_34.id)).toBe(false); expect(await propertiesOf(db, "op-2")).toEqual(["PROP-TEST-B"]);
  });
  it("registers written for B are read by B's cycle and not by A's; a new import discards the context snapshot without manual intervention", async () => {
    await saveRegisters(db, "PROP-TEST-B", { events: [{ id: "EV-1", name: "Synthetic festival", startDate: "2026-11-01", endDate: "2026-11-02", venue: "nearby", distanceKm: 3, expectedAttendance: 5000, category: "festival", enteredBy: "operator", source: "operator register", evidenceNote: "test" } as never] });
    expect((await loadRegisters(db, "PROP-TEST-B")).events).toHaveLength(1); expect((await loadRegisters(db, COUNTRY_HOUSE_34.id)).events).toHaveLength(0);
    const dir = mkdtempSync(join(tmpdir(), "anesis-coh-")); const file = join(dir, "b.csv"); writeFileSync(file, csv(20));
    await scheduleCycle(db, "PROP-TEST-B", T1, 7);
    expect((await runOnce(db, { offline: true, now: () => T1 })).processed[0]?.outcome).toBe("done");   // first cycle: collects, snapshot stored
    expect((await db.query("select 1 from context_snapshots where property_id = 'PROP-TEST-B'")).rows).toHaveLength(1);
    await importFile(db, file, { propertyId: "PROP-TEST-B", rooms: 20, importedAt: T1 });
    expect((await db.query("select 1 from context_snapshots where property_id = 'PROP-TEST-B'")).rows).toHaveLength(0);   // C10
    expect((await runOnce(db, { offline: true, now: () => T2 })).processed[0]?.outcome).toBe("done");
    expect((await db.query("select 1 from runtime_traces where property_id = 'PROP-TEST-B' and type = 'COLLECTED'")).rows).toHaveLength(2);   // one collection per cycle: the import forced the second
    const ev = (await db.query<{ detail: string }>("select detail from runtime_traces where property_id = 'PROP-TEST-B' and type = 'CONN-EVENTS' order by id desc limit 1")).rows[0];
    expect(ev?.detail).toMatch(/1 operator-entered event/);
    const mB = await new PgModelStore(db).load("PROP-TEST-B"); expect(mB?.cycles).toHaveLength(2); expect(mB?.cycles[1]!.verifiedMetrics).toEqual(expect.arrayContaining(["occupancy", "adr"]));
    expect(mB?.spec.id).toBe("PROP-TEST-B");
    const mA = await new PgModelStore(db).load(COUNTRY_HOUSE_34.id); expect(mA).toBeNull();   // the other property was never touched
  });
  it("the full cycle result is persisted and re-readable: a contract's cited observation is found with its evidence chain after a restart", async () => {
    const stored = await loadCycleResult(db, "PROP-TEST-B", "RUN-002"); expect(stored).toBeTruthy();
    expect(stored!.result.property.observations.length).toBeGreaterThan(10); expect(stored!.result.diagnosis.binding).toBeTruthy();
    const c = (await db.query<{ run_id: string; contract: { sources: { id: string }[] } }>("select run_id, contract from interventions where property_id = 'PROP-TEST-B' order by prepared_at desc limit 1")).rows[0];
    const cycleOfContract = await loadCycleResult(db, "PROP-TEST-B", c!.run_id);
    const cited = c!.contract.sources[0]!.id; const obs = cycleOfContract!.result.property.observations.find((o) => o.id === cited);
    expect(obs).toBeTruthy(); expect(typeof obs!.transformation).toBe("string");
    expect((await listCycleResults(db, "PROP-TEST-B")).map((x) => x.runId)).toEqual(["RUN-002", "RUN-001"]);
    expect(await listCycleResults(db, COUNTRY_HOUSE_34.id)).toEqual([]);
  });
});
