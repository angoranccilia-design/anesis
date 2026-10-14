import { runCycle, EngineBus, COUNTRY_HOUSE_34, newModel, appendCycle, cycleInputFromModel, modelSummary, type PropertySpec, type ExternalContext } from "@anesis/engine";
import { buildContext, emptyRegisters, type OperatorRegisters } from "@anesis/connectors";
import type { SqlClient } from "./sql.js";
import { PgModelStore } from "./store.js";
import { claim, complete, enqueue, fail, recoverExpired, type Job } from "./queue.js";
import { trace } from "./trace.js";
import { latestImport } from "./imports.js";

export interface WorkerDeps {
  readonly spec?: PropertySpec;                 // the property this runtime serves (one for now; the model store holds many)
  readonly registers?: OperatorRegisters;       // operator-entered data (events, competitors, systems, providers, partnership)
  readonly offline?: boolean;                   // no live connector calls (tests, air-gapped runs)
  readonly cadenceDays?: number;                // days between scheduled cycles
  readonly budgetGbp?: number;
  readonly now?: () => string;
}

const nowIso = () => new Date().toISOString();
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString();
/** One cycle per property per cadence window: the key is what makes a second schedule a no-op. */
export const cycleKey = (propertyId: string, runAtIso: string, cadenceDays: number) => `cycle:${propertyId}:${Math.floor(Date.parse(runAtIso) / (cadenceDays * 86_400_000))}`;

/** Schedules the next decision cycle for a property. Returns whether a job was created or already existed. */
export async function scheduleCycle(db: SqlClient, propertyId: string, runAtIso: string, cadenceDays = 7): Promise<{ created: boolean; key: string }> {
  const key = cycleKey(propertyId, runAtIso, cadenceDays);
  const r = await enqueue(db, { kind: "cycle", key, payload: { propertyId, cadenceDays }, runAt: runAtIso });
  return { created: !r.duplicate, key };
}

export async function scheduleCollect(db: SqlClient, propertyId: string, runAtIso: string): Promise<{ created: boolean }> {
  const r = await enqueue(db, { kind: "collect", key: `collect:${propertyId}:${runAtIso.slice(0, 13)}`, payload: { propertyId }, runAt: runAtIso });
  return { created: !r.duplicate };
}

async function latestSnapshot(db: SqlClient, propertyId: string, maxAgeMs: number, now: string): Promise<ExternalContext | null> {
  const r = await db.query<{ context: unknown; fetched_at: string }>(`select context, fetched_at from context_snapshots where property_id = $1 order by fetched_at desc limit 1`, [propertyId]);
  const row = r.rows[0]; if (!row) return null;
  if (Date.parse(now) - Date.parse(new Date(row.fetched_at).toISOString()) > maxAgeMs) return null;
  return (typeof row.context === "string" ? JSON.parse(row.context) : row.context) as ExternalContext;
}

/** Operator registers plus the latest PMS file import for the property, if one exists: that is how a real export reaches the engine. */
async function registersFor(db: SqlClient, propertyId: string, deps: WorkerDeps): Promise<OperatorRegisters> {
  const base = deps.registers ?? emptyRegisters();
  const imp = await latestImport(db, propertyId); if (!imp || !imp.snapshot) return base;
  return { ...base, systems: { ...base.systems, pms: imp.snapshot }, sourceQuality: { ...base.sourceQuality, "CONN-PMS": imp.quality } };
}

async function collect(db: SqlClient, job: Job, deps: WorkerDeps, now: string): Promise<ExternalContext> {
  const spec = deps.spec ?? COUNTRY_HOUSE_34; const t0 = Date.now();
  const ctx = await buildContext(spec, await registersFor(db, spec.id, deps), { offline: deps.offline });
  const connected = ctx.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.id);
  await db.query(`insert into context_snapshots (property_id, fetched_at, connected, context) values ($1, $2, $3, $4::jsonb)`, [spec.id, ctx.fetchedAt, connected, JSON.stringify(ctx)]);
  for (const c of ctx.connectors) await trace(db, { jobId: job.id, propertyId: spec.id, kind: "connector", type: c.id, state: c.status, detail: c.statusNote, at: now });
  await trace(db, { jobId: job.id, propertyId: spec.id, kind: "job", type: "COLLECTED", state: "done", detail: `${connected.length} connected: ${connected.join(", ") || "none"}`, at: now, durationMs: Date.now() - t0 });
  return ctx;
}

async function cycle(db: SqlClient, job: Job, deps: WorkerDeps, now: string): Promise<void> {
  const spec = deps.spec ?? COUNTRY_HOUSE_34; const store = new PgModelStore(db); const t0 = Date.now();
  const model = (await store.load(spec.id)) ?? newModel(spec, now);
  const context = (await latestSnapshot(db, spec.id, 6 * 3600_000, now)) ?? (await collect(db, job, deps, now));
  const runId = `RUN-${String(model.cycles.length + 1).padStart(3, "0")}`;
  const bus = new EngineBus(); const rows: Promise<void>[] = [];
  bus.subscribe((e) => { rows.push(trace(db, { jobId: job.id, runId, propertyId: spec.id, kind: "engine", type: e.type, state: e.state, detail: e.detail, at: e.at })); });
  const input = cycleInputFromModel(model);
  const result = runCycle({ seed: model.cycles.length + 1, budgetGbp: deps.budgetGbp ?? 16_000, now, memory: input.memory, propertyMemory: input.propertyMemory, cycleNumber: input.cycleNumber, context, bus });
  await Promise.all(rows);
  const next = appendCycle(model, result, { id: runId, at: now });
  await store.save(next);
  await trace(db, { jobId: job.id, runId, propertyId: spec.id, kind: "model", type: "MODEL_PERSISTED", state: "done", detail: modelSummary(next, now), at: now, durationMs: Date.now() - t0 });
  const cadence = Number(job.payload.cadenceDays ?? deps.cadenceDays ?? 7);
  const nextAt = addDays(job.runAt, cadence);
  const s = await scheduleCycle(db, spec.id, nextAt, cadence);
  await trace(db, { jobId: job.id, runId, propertyId: spec.id, kind: "job", type: "NEXT_CYCLE_SCHEDULED", state: s.created ? "created" : "already scheduled", detail: `${s.key} at ${nextAt}`, at: now });
}

/** Processes every due job once. Returns what it did; the caller decides whether to loop. */
export async function runOnce(db: SqlClient, deps: WorkerDeps = {}): Promise<{ recovered: number; processed: { id: number; kind: string; outcome: string }[] }> {
  const now = deps.now ? deps.now() : nowIso();
  const recovered = await recoverExpired(db, now);
  const processed: { id: number; kind: string; outcome: string }[] = [];
  for (;;) {
    const job = await claim(db, now); if (!job) break;
    await trace(db, { jobId: job.id, kind: "job", type: "CLAIMED", state: job.kind, detail: `${job.key} attempt ${job.attempts}/${job.maxAttempts}`, at: now });
    try {
      if (job.kind === "cycle") await cycle(db, job, deps, now); else await collect(db, job, deps, now);
      await complete(db, job.id); processed.push({ id: job.id, kind: job.kind, outcome: "done" });
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      const outcome = await fail(db, job, msg, now);
      await trace(db, { jobId: job.id, kind: "job", type: "FAILED", state: outcome, detail: msg, at: now });
      processed.push({ id: job.id, kind: job.kind, outcome });
    }
  }
  return { recovered, processed };
}

/** The long-running process: poll, process, sleep. Stops on SIGINT/SIGTERM after the current job. */
export async function startWorker(db: SqlClient, deps: WorkerDeps = {}, pollMs = 15_000): Promise<void> {
  let stop = false; const onStop = () => { stop = true; }; process.on("SIGINT", onStop); process.on("SIGTERM", onStop);
  while (!stop) { const r = await runOnce(db, deps); if (!r.processed.length) await new Promise((res) => setTimeout(res, pollMs)); }
}
