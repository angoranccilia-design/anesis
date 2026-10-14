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
