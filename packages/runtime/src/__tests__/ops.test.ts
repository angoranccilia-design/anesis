/** Chantier E — health, backup/restore and log redaction on the embedded database. SYNTHETIC. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs"; import { join } from "node:path"; import { tmpdir } from "node:os";
import { openDatabase, migrate, health, backup, restore, redact, scheduleCycle, runOnce, upsertProperty, saveRegisters, workerState, startHealthServer, type SqlClient } from "../index.js";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";
let db: SqlClient; let dir: string;
beforeAll(async () => { dir = mkdtempSync(join(tmpdir(), "anesis-ops-")); db = await openDatabase({}); await migrate(db); });
afterAll(async () => { await db.close(); rmSync(dir, { recursive: true, force: true }); });

describe("E — operations", () => {
  it("health: ok on an idle database; not ok with an overdue job, a failed job, a stale worker poll; served over HTTP with 200/503", async () => {
    expect((await health(db, "2026-10-14T09:00:00Z")).ok).toBe(true);
    await db.query("insert into runtime_jobs (kind, key, run_at, state) values ('cycle', 'cycle:late', '2026-10-14T08:00:00Z', 'queued')");
    await db.query("insert into runtime_jobs (kind, key, run_at, state, attempts, max_attempts) values ('cycle', 'cycle:dead', '2026-10-14T08:00:00Z', 'failed', 3, 3)");
    workerState.lastPollAt = "2026-10-14T08:00:00Z";
    const h = await health(db, "2026-10-14T09:00:00Z"); expect(h.ok).toBe(false); expect(h.overdueJobs).toBe(1); expect(h.failedJobs).toBe(1); expect(h.problems.join(" ")).toMatch(/overdue/); expect(h.problems.join(" ")).toMatch(/failed/); expect(h.problems.join(" ")).toMatch(/worker last polled/);
    const srv = startHealthServer(db, 0); const port = (srv.address() as { port: number }).port;
    const res = await fetch(`http://127.0.0.1:${port}/health`); expect(res.status).toBe(503); expect(((await res.json()) as { problems: string[] }).problems.length).toBeGreaterThan(0);
    expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404); srv.close();
    await db.query("delete from runtime_jobs"); workerState.lastPollAt = null;
  });
  it("backup writes the business tables as JSON; restore into an empty database brings them back and never overwrites", async () => {
    await upsertProperty(db, { ...COUNTRY_HOUSE_34, id: "PROP-OPS", name: "Ops (synthetic)" }); await saveRegisters(db, "PROP-OPS", { benchmarks: { "ota_share.target": { value: 0.3, source: "SYNTHETIC", asOf: "2026-01-01" } } });
    await scheduleCycle(db, "PROP-OPS", "2026-10-14T09:00:00Z", 7); expect((await runOnce(db, { offline: true, now: () => "2026-10-14T09:00:00Z" })).processed[0]?.outcome).toBe("done");
    const b = await backup(db, dir); expect(Object.fromEntries(b.map((x) => [x.table, x.rows]))).toMatchObject({ properties: 1, property_models: 1, operator_registers: 1, cycle_results: 1 }); expect(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")).tables).toHaveLength(7);
    const db2 = await openDatabase({}); await migrate(db2);
    const r = await restore(db2, dir); expect(Object.fromEntries(r.map((x) => [x.table, x.inserted]))).toMatchObject({ properties: 1, property_models: 1, cycle_results: 1 });
    expect((await db2.query("select cycles from property_models where property_id = 'PROP-OPS'")).rows[0]).toMatchObject({ cycles: 1 });
    const again = await restore(db2, dir); expect(again.every((x) => x.inserted === 0)).toBe(true); await db2.close();
  });
  it("logs redact secrets by key name", () => {
    expect(redact({ apiKey: "sk-1", nested: { token: "t", fine: 1 }, databaseUrl: "postgres://u:p@h/db", list: [{ password: "x" }] })).toEqual({ apiKey: "[redacted]", nested: { token: "[redacted]", fine: 1 }, databaseUrl: "[redacted]", list: [{ password: "[redacted]" }] });
  });
});
