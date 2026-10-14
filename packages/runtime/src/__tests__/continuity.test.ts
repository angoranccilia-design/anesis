/** C6 on the runtime: open contracts reach the next cycle; no duplicate proposal; resume after failure is atomic. SYNTHETIC property only. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { openDatabase, migrate, PgModelStore, runOnce, scheduleCycle, listJobs, tracesFor, listInterventions, loadIntervention, transitionIntervention, openInterventions, type SqlClient } from "../index.js";
import { COUNTRY_HOUSE_34, observedChange } from "@anesis/engine";
const WEEKLY = Array.from({ length: 80 }, (_, i) => ({ weekStart: new Date(Date.parse("2025-04-07T00:00:00Z") + i * 7 * 86_400_000).toISOString().slice(0, 10), roomNights: 100, revenueGbp: 20_000 }));   // SYNTHETIC flat history

let db: SqlClient;
const P = COUNTRY_HOUSE_34.id;
const T1 = "2026-10-14T09:00:00.000Z", T2 = "2026-10-21T09:00:00.000Z", T3 = "2026-10-28T09:00:00.000Z", T4 = "2026-11-04T09:00:00.000Z";
const human = (at: string) => ({ by: "Cecilia (founder)", human: true, at });
const byIntervention = async (id: string) => (await listInterventions(db, P)).filter((x) => x.interventionId === id);
beforeAll(async () => { db = await openDatabase({ databaseUrl: undefined, pgliteDir: undefined }); await migrate(db); });
afterAll(async () => { await db.close(); });

describe("C6 — continuity of interventions through the runtime", () => {
  it("cycle 1 prepares contracts; a human authorises I-001 and starts execution", async () => {
    await scheduleCycle(db, P, T1, 7);
    expect((await runOnce(db, { offline: true, now: () => T1 })).processed[0]?.outcome).toBe("done");
    const c = await loadIntervention(db, "INT-RUN-001-I-001"); expect(c?.state).toBe("PREPARED"); expect(c?.decisionStatus).toBe("FUNDED");
    await transitionIntervention(db, c!.id, { to: "SUBMITTED", actor: { by: "engine", human: false, at: T1 } });
    await transitionIntervention(db, c!.id, { to: "AUTHORISED", actor: human("2026-10-16T10:00:00.000Z"), approvedAmountGbp: 7_500 });
    const e = await transitionIntervention(db, c!.id, { to: "IN_EXECUTION", actor: human("2026-10-17T10:00:00.000Z") });
    expect(e.budgetStatus).toBe("IN_EXECUTION"); expect(e.approvedCost.amountGbp).toBe(7_500);
    const open = await openInterventions(db, P);
    expect(open.committed).toEqual([expect.objectContaining({ interventionId: "I-001", contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION", approvedGbp: 7_500, awaitingMeasurement: false })]);
    expect(open.pending.length).toBeGreaterThan(0); expect(open.pending.every((p) => p.interventionId !== "I-001")).toBe(true);
  });
  it("cycle 2 sees I-001 in progress: no second contract, IN_PROGRESS in the model and the traces; pending proposals are kept, not duplicated", async () => {
    const pendingBefore = (await openInterventions(db, P)).pending;
    expect((await runOnce(db, { offline: true, now: () => T2 })).processed[0]?.outcome).toBe("done");
    expect(await byIntervention("I-001")).toHaveLength(1);                                   // no INT-RUN-002-I-001
    const m = await new PgModelStore(db).load(P);
    expect(m?.cycles[1]!.inProgress).toEqual([{ interventionId: "I-001", contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION" }]);
    expect(m?.cycles[1]!.budgets.find((b) => b.interventionId === "I-001")).toMatchObject({ decisionStatus: "IN_PROGRESS", budgetStatus: "IN_EXECUTION", approvedGbp: 7_500 });
    expect(m?.memory.executions[0]).toMatchObject({ contractId: "INT-RUN-001-I-001", state: "IN_EXECUTION" });
    const tr = await tracesFor(db, "RUN-002");
    expect(tr.some((t) => t.type === "INTERVENTION_IN_PROGRESS")).toBe(true); expect(tr.some((t) => t.type === "MEMORY_RECALLED" && /Currently IN_EXECUTION on INT-RUN-001-I-001/.test(String(t.detail)))).toBe(true);
    expect(tr.some((t) => t.type === "MODEL_PERSISTED" && /1 in progress: I-001 IN_EXECUTION/.test(String(t.detail)))).toBe(true);
    const kept = tr.filter((t) => t.type === "INTERVENTION_PENDING_KEPT").length; let superseded = 0;
    for (const p of pendingBefore) { const same = await byIntervention(p.interventionId); expect(same.filter((x) => x.state !== "WITHDRAWN")).toHaveLength(1); const old = same.find((x) => x.id === p.contractId)!; if (old.state === "WITHDRAWN") { superseded++; expect((await loadIntervention(db, old.id))!.history.at(-1)!.note).toMatch(/superseded by RUN-002/); expect(same.some((x) => x.id === `INT-RUN-002-${p.interventionId}`)).toBe(true); } }
    expect(kept + superseded).toBe(pendingBefore.length); expect(kept).toBeGreaterThan(0);
  });
  it("awaiting measurement: once executed, the next cycle still holds it and asks for the measurement record; once closed, it is proposed again", async () => {
    await transitionIntervention(db, "INT-RUN-001-I-001", { to: "EXECUTED", actor: human("2026-10-25T10:00:00.000Z"), proofs: [{ kind: "deployment", reference: "deploy-2026-10-25", note: "" }], actualSpendGbp: 7_100 });
    expect((await runOnce(db, { offline: true, now: () => T3 })).processed[0]?.outcome).toBe("done");
    expect(await byIntervention("I-001")).toHaveLength(1);
    const tr3 = await tracesFor(db, "RUN-003"); expect(tr3.some((t) => t.type === "INTERVENTION_IN_PROGRESS" && /awaiting its measurement record/.test(String(t.detail)))).toBe(true);
    expect((await new PgModelStore(db).load(P))!.memory.executions[0]).toMatchObject({ state: "EXECUTED" });
    await transitionIntervention(db, "INT-RUN-001-I-001", { to: "MEASURED", actor: human("2026-11-01T10:00:00.000Z"), observed: observedChange({ weekly: WEEKLY, executedAt: "2026-10-25", windowWeeks: 1 }, "2026-11-01T10:00:00.000Z") });
    await transitionIntervention(db, "INT-RUN-001-I-001", { to: "CLOSED", actor: human("2026-11-02T10:00:00.000Z") });
    expect((await openInterventions(db, P)).committed).toHaveLength(0);
    expect((await runOnce(db, { offline: true, now: () => T4 })).processed[0]?.outcome).toBe("done");
    const after = await byIntervention("I-001"); expect(after.map((x) => x.id)).toContain("INT-RUN-004-I-001");   // closed: eligible again, a new contract on a new run
  });
  it("resume after failure: a cycle whose writes fail commits nothing and retries; a retried job whose cycle was committed does not run twice", async () => {
    const before = (await new PgModelStore(db).load(P))!; const n = before.cycles.length; const contractsBefore = (await listInterventions(db, P)).length;
    const T5 = "2026-11-11T09:00:00.000Z";
    await db.query("alter table interventions rename to interventions_broken");                 // the contract write will fail mid-cycle
    const r = await runOnce(db, { offline: true, now: () => T5 });
    expect(r.processed[0]).toMatchObject({ kind: "cycle", outcome: "retry" });
    expect((await new PgModelStore(db).load(P))!.cycles).toHaveLength(n);                           // the model write was rolled back with the rest
    expect((await listJobs(db)).filter((j) => j.state === "queued" && j.key.startsWith("cycle:")).length).toBe(1);   // no next cycle was scheduled either
    await db.query("alter table interventions_broken rename to interventions");
    const retryAt = (await listJobs(db)).find((j) => j.state === "queued" && j.key.startsWith("cycle:"))!.runAt;
    const ok = await runOnce(db, { offline: true, now: () => retryAt }); expect(ok.processed[0]?.outcome).toBe("done");
    const m = (await new PgModelStore(db).load(P))!; expect(m.cycles).toHaveLength(n + 1); expect(m.cycles.at(-1)!.jobKey).toMatch(/^cycle:/);
    expect((await listInterventions(db, P)).length).toBeGreaterThanOrEqual(contractsBefore); expect((await tracesFor(db, m.cycles.at(-1)!.id)).some((t) => t.type === "INTERVENTION_PREPARED" || t.type === "INTERVENTION_PENDING_KEPT")).toBe(true);
    // the job finished but, say, the process died before marking it done: it comes back queued and must not append a second cycle
    const key = m.cycles.at(-1)!.jobKey!;
    await db.query("update runtime_jobs set state = 'queued', locked_until = null where key = $1", [key]);
    const again = await runOnce(db, { offline: true, now: () => retryAt }); expect(again.processed.some((p) => p.kind === "cycle" && p.outcome === "done")).toBe(true);
    const m2 = (await new PgModelStore(db).load(P))!; expect(m2.cycles).toHaveLength(n + 1);
    expect((await tracesFor(db, m.cycles.at(-1)!.id)).some((t) => t.type === "CYCLE_ALREADY_PERSISTED")).toBe(true);
  });
});
