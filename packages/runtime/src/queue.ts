import type { SqlClient } from "./sql.js";

/**
 * Durable jobs on Postgres. The guarantees the founder asked for, each enforced by the table, not by code paths:
 * - scheduled execution: a job has `run_at`; a worker claims jobs whose time has come;
 * - no dangerous duplicates: one live job per `key` (unique partial index) — scheduling the same cycle twice is a no-op;
 * - resume after failure: a claimed job holds `locked_until`; if the worker dies, the lock expires and the job is re-claimed;
 * - bounded retries: `attempts` / `max_attempts`, then `failed` with the error kept.
 * Claiming uses SELECT … FOR UPDATE SKIP LOCKED, so several workers can share one table.
 */
export type JobKind = "cycle" | "collect";
export interface Job { readonly id: number; readonly kind: JobKind; readonly key: string; readonly payload: Record<string, unknown>; readonly runAt: string; readonly state: "queued" | "running" | "done" | "failed"; readonly attempts: number; readonly maxAttempts: number; readonly lastError: string | null }

const row = (r: Record<string, unknown>): Job => ({ id: Number(r.id), kind: r.kind as JobKind, key: String(r.key), payload: (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload) as Record<string, unknown>, runAt: new Date(r.run_at as string).toISOString(), state: r.state as Job["state"], attempts: Number(r.attempts), maxAttempts: Number(r.max_attempts), lastError: (r.last_error as string | null) ?? null });

export async function enqueue(db: SqlClient, j: { kind: JobKind; key: string; payload?: Record<string, unknown>; runAt: string; maxAttempts?: number }): Promise<{ id: number | null; duplicate: boolean }> {
  const r = await db.query<{ id: number }>(
    `insert into runtime_jobs (kind, key, payload, run_at, max_attempts) values ($1, $2, $3::jsonb, $4, $5)
     on conflict (key) where state in ('queued','running') do nothing returning id`,
    [j.kind, j.key, JSON.stringify(j.payload ?? {}), j.runAt, j.maxAttempts ?? 3]);
  return r.rows[0] ? { id: Number(r.rows[0].id), duplicate: false } : { id: null, duplicate: true };
}

/** Jobs whose lock expired while running are returned to the queue: that is the resume after a crash. */
export async function recoverExpired(db: SqlClient, nowIso: string): Promise<number> {
  const r = await db.query<{ id: number }>(`update runtime_jobs set state = 'queued', locked_until = null, last_error = coalesce(last_error, '') || ' [lock expired; resumed]' where state = 'running' and locked_until < $1 returning id`, [nowIso]);
  return r.rows.length;
}

export async function claim(db: SqlClient, nowIso: string, lockSeconds = 300): Promise<Job | null> {
  const lockedUntil = new Date(Date.parse(nowIso) + lockSeconds * 1000).toISOString();
  const r = await db.query<Record<string, unknown>>(
    `update runtime_jobs set state = 'running', locked_until = $2, attempts = attempts + 1
     where id = (select id from runtime_jobs where state = 'queued' and run_at <= $1 order by run_at, id limit 1 for update skip locked)
     returning *`, [nowIso, lockedUntil]);
  return r.rows[0] ? row(r.rows[0]) : null;
}

export async function complete(db: SqlClient, id: number): Promise<void> { await db.query(`update runtime_jobs set state = 'done', locked_until = null, finished_at = now() where id = $1`, [id]); }

/** Retry with exponential backoff until max_attempts, then fail for good. The error is always kept. */
export async function fail(db: SqlClient, job: Job, error: string, nowIso: string): Promise<"retry" | "failed"> {
  if (job.attempts >= job.maxAttempts) { await db.query(`update runtime_jobs set state = 'failed', locked_until = null, last_error = $2, finished_at = now() where id = $1`, [job.id, error]); return "failed"; }
  const delayS = Math.min(3600, 30 * 2 ** (job.attempts - 1));
  await db.query(`update runtime_jobs set state = 'queued', locked_until = null, last_error = $2, run_at = $3 where id = $1`, [job.id, error, new Date(Date.parse(nowIso) + delayS * 1000).toISOString()]);
  return "retry";
}

export async function listJobs(db: SqlClient, limit = 50): Promise<Job[]> { return (await db.query<Record<string, unknown>>(`select * from runtime_jobs order by id desc limit $1`, [limit])).rows.map(row); }
