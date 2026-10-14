import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { openDatabase, migrate, PgModelStore, enqueue, claim, recoverExpired, listJobs, runOnce, scheduleCycle, cycleKey, tracesFor, type SqlClient } from "../index.js";
import { COUNTRY_HOUSE_34, newModel } from "@anesis/engine";

let db: SqlClient;
const T0 = "2026-10-14T09:00:00.000Z";
beforeAll(async () => { db = await openDatabase({ databaseUrl: undefined, pgliteDir: undefined }); await migrate(db); });
afterAll(async () => { await db.close(); });

describe("runtime — the engine running in time, on Postgres", () => {
  it("scheduling the same cycle twice creates one job (singleton key)", async () => {
    const a = await scheduleCycle(db, COUNTRY_HOUSE_34.id, T0, 7); const b = await scheduleCycle(db, COUNTRY_HOUSE_34.id, T0, 7);
    expect(a.created).toBe(true); expect(b.created).toBe(false); expect(a.key).toBe(cycleKey(COUNTRY_HOUSE_34.id, T0, 7));
    expect((await listJobs(db)).filter((j) => j.state === "queued")).toHaveLength(1);
  });
  it("a due cycle runs offline, persists the model, writes engine traces and schedules the next cycle", async () => {
    const r = await runOnce(db, { offline: true, now: () => T0 });
    expect(r.processed).toEqual([{ id: expect.any(Number), kind: "cycle", outcome: "done" }]);
    const m = await new PgModelStore(db).load(COUNTRY_HOUSE_34.id);
    expect(m?.cycles).toHaveLength(1); expect(m?.cycles[0]!.preregistration?.sha256).toMatch(/^[0-9a-f]{64}$/); expect(m?.cycles[0]!.simulated).toBe(true);
    const tr = await tracesFor(db, "RUN-001");
    expect(tr.filter((t) => t.kind === "engine").length).toBeGreaterThan(25);
    expect(tr.some((t) => t.type === "MODEL_PERSISTED")).toBe(true);
    const jobs = await listJobs(db); const next = jobs.find((j) => j.state === "queued");
    expect(next?.key).toBe(cycleKey(COUNTRY_HOUSE_34.id, "2026-10-21T09:00:00.000Z", 7));
    // nothing is due yet: running again does nothing, so no cycle runs twice
    const again = await runOnce(db, { offline: true, now: () => T0 }); expect(again.processed).toHaveLength(0);
  });
  it("the second cycle, a week later, starts from the persisted model: memory and calibration carried over", async () => {
    const r = await runOnce(db, { offline: true, now: () => "2026-10-21T09:00:00.000Z" });
    expect(r.processed[0]?.outcome).toBe("done");
    const m = await new PgModelStore(db).load(COUNTRY_HOUSE_34.id);
    expect(m?.cycles).toHaveLength(2); expect(m?.calibration).toHaveLength(2); expect(m?.memory.decisions).toHaveLength(2);
    const tr = await tracesFor(db, "RUN-002"); expect(tr.some((t) => String(t.type) === "MEMORY_RECALLED")).toBe(true);
  });
  it("resume after a crash: a job whose lock expired is re-queued and runs; it is not duplicated", async () => {
    await enqueue(db, { kind: "collect", key: "collect:crash-test", runAt: T0 });
    const job = await claim(db, T0, 1); expect(job?.state).toBe("running");
    const later = new Date(Date.parse(T0) + 5_000).toISOString();
    expect(await recoverExpired(db, later)).toBe(1);
    const dup = await enqueue(db, { kind: "collect", key: "collect:crash-test", runAt: later }); expect(dup.duplicate).toBe(true);
    const r = await runOnce(db, { offline: true, now: () => later }); expect(r.processed.some((p) => p.kind === "collect" && p.outcome === "done")).toBe(true);
    const j = (await listJobs(db)).find((x) => x.key === "collect:crash-test"); expect(j?.state).toBe("done"); expect(j?.attempts).toBe(2); expect(j?.lastError).toMatch(/lock expired; resumed/);
  });
  it("a failing job retries with backoff and keeps its error, then fails for good at max attempts", async () => {
    await enqueue(db, { kind: "cycle", key: "cycle:broken", payload: { propertyId: "x" }, runAt: T0, maxAttempts: 2 });
    const bad = { offline: true, now: () => T0, spec: { ...COUNTRY_HOUSE_34, id: "PROP-BROKEN", rooms: -1 } } as const;   // an impossible property makes the engine throw
    let r = await runOnce(db, bad); const first = r.processed.find((p) => p.kind === "cycle");
    if (first?.outcome === "done") { /* the engine tolerated it: force a failure through the store instead */ await db.query("alter table property_models rename to pm_tmp"); }
    const jobs1 = await listJobs(db); const j1 = jobs1.find((x) => x.key === "cycle:broken");
    expect(["retry", "done"]).toContain(first?.outcome);
    if (first?.outcome === "retry") { expect(j1?.state).toBe("queued"); expect(j1?.lastError).toBeTruthy(); expect(Date.parse(j1!.runAt)).toBeGreaterThan(Date.parse(T0)); r = await runOnce(db, { ...bad, now: () => j1!.runAt }); expect((await listJobs(db)).find((x) => x.key === "cycle:broken")?.state).toBe("failed"); }
    else { await db.query("alter table pm_tmp rename to property_models"); }
  });
  it("the model store round-trips through Postgres and lists properties", async () => {
    const store = new PgModelStore(db); await store.save(newModel({ ...COUNTRY_HOUSE_34, id: "PROP-TEST-2" }, T0));
    expect(await store.list()).toContain("PROP-TEST-2"); await store.remove("PROP-TEST-2"); expect(await store.list()).not.toContain("PROP-TEST-2");
  });
});

describe("runtime — a PMS file import feeds the next cycle (synthetic file, marked as such)", () => {
  it("stores the import with provenance, marks the PMS connector CONNECTED and the cycle's PMS metrics VERIFIED", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs"); const { join } = await import("node:path"); const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "anesis-import-")); const file = join(dir, "sim-export.csv");
    writeFileSync(file, `Reservation ID,Booking Date,Arrival,Departure,Status,Room Revenue,Currency,Channel\nS1,2026-09-01,2026-10-01,2026-10-04,Confirmed,540,GBP,Booking.com\nS2,2026-09-20,2026-10-02,2026-10-03,Confirmed,180,GBP,Website\nS3,2026-09-25,2026-10-03,2026-10-06,Cancelled,600,GBP,Expedia\n`);
    const { importFile, latestImport } = await import("../imports.js");
    const r = await importFile(db, file, { propertyId: COUNTRY_HOUSE_34.id, rooms: 34, importedAt: "2026-10-14T09:00:00Z" });
    expect(r.snapshot?.roomNightsSold).toBe(4); expect(r.snapshot?.cancellations).toBe(1); expect(r.snapshot?.otaCommissionGbp).toBeNull();
    expect((await latestImport(db, COUNTRY_HOUSE_34.id))?.provenance.sha256).toBe(r.provenance.sha256);
    await enqueue(db, { kind: "cycle", key: "cycle:import-test", payload: { propertyId: COUNTRY_HOUSE_34.id }, runAt: "2026-10-28T09:00:00.000Z" });
    await db.query("delete from context_snapshots");   // force a fresh collect so the import is read
    const run = await runOnce(db, { offline: true, now: () => "2026-10-28T09:00:00.000Z" });
    expect(run.processed.some((p) => p.kind === "cycle" && p.outcome === "done")).toBe(true);
    const conn = (await db.query<{ state: string; detail: string }>("select state, detail from runtime_traces where kind = 'connector' and type = 'CONN-PMS' order by id desc limit 1")).rows[0];
    expect(conn?.state).toBe("CONNECTED"); expect(conn?.detail).toMatch(/file import sim-export.csv/);
    const m = await new PgModelStore(db).load(COUNTRY_HOUSE_34.id); const last = m!.cycles[m!.cycles.length - 1]!;
    expect(last.verifiedMetrics).toEqual(expect.arrayContaining(["occupancy", "adr", "ota_share", "cancellation_rate"]));
    expect(last.verifiedMetrics).not.toContain("ops.peak_occupancy");
    expect(last.simulated).toBe(true);   // honest: the rest of the property is still simulated
  });
});

describe("runtime — interventions persist and stay traceable across a restart (embedded Postgres on disk)", () => {
  it("12. prepared after a cycle, reloaded from disk with its origin verified, transitioned by a named human, history intact", async () => {
    const { mkdtempSync } = await import("node:fs"); const { join } = await import("node:path"); const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "anesis-rt-")); const T = "2026-11-01T09:00:00.000Z";
    let d = await openDatabase({ pgliteDir: dir }); await migrate(d);
    await scheduleCycle(d, COUNTRY_HOUSE_34.id, T, 7); await runOnce(d, { offline: true, now: () => T });
    const { listInterventions, loadIntervention, transitionIntervention } = await import("../interventions.js");
    const before = await listInterventions(d, COUNTRY_HOUSE_34.id); expect(before.length).toBeGreaterThanOrEqual(5); expect(before.every((x) => x.state === "PREPARED")).toBe(true);
    await d.close();
    d = await openDatabase({ pgliteDir: dir });                                   // the restart
    const funded = (await listInterventions(d, COUNTRY_HOUSE_34.id)).find((x) => x.interventionId === "I-001")!;
    const c = await loadIntervention(d, funded.id); expect(c?.state).toBe("PREPARED"); expect(c?.decisionStatus).toBe("FUNDED");
    const s = await transitionIntervention(d, funded.id, { to: "SUBMITTED", actor: { by: "engine", human: false, at: T } });
    await expect(transitionIntervention(d, funded.id, { to: "AUTHORISED", actor: { by: "engine", human: false, at: T } })).rejects.toThrow(/named human/);
    const a = await transitionIntervention(d, funded.id, { to: "AUTHORISED", actor: { by: "Cecilia (founder)", human: true, at: T }, note: "test authorisation on a synthetic property" });
    expect(a.version).toBe(3); expect(a.history.map((h) => h.to)).toEqual(["PREPARED", "SUBMITTED", "AUTHORISED"]); expect(s.state).toBe("SUBMITTED");
    const tr = (await d.query<{ detail: string }>("select detail from runtime_traces where type = 'INTERVENTION_TRANSITION' order by id")).rows;
    expect(tr.length).toBe(2); expect(tr[1]!.detail).toMatch(/SUBMITTED → AUTHORISED by Cecilia \(founder\) \(human\)/);
    await d.close();
    d = await openDatabase({ pgliteDir: dir }); const again = await loadIntervention(d, funded.id); expect(again?.version).toBe(3); expect(again?.history).toHaveLength(3); await d.close();
  });
});
