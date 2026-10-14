import { createServer, type Server } from "node:http";
import type { SqlClient } from "./sql.js";

/** What a supervisor needs to know: the database answers, jobs are not stuck, each property had a cycle recently, the worker polled recently. */
export interface Health { readonly ok: boolean; readonly at: string; readonly backend: string; readonly lastPollAt: string | null; readonly overdueJobs: number; readonly failedJobs: number; readonly properties: { id: string; cycles: number; lastCycleAt: string | null; ageHours: number | null }[]; readonly problems: string[] }
export const workerState: { lastPollAt: string | null } = { lastPollAt: null };

export async function health(db: SqlClient, now = new Date().toISOString(), maxCycleAgeHours = 24 * 8, maxPollAgeMs = 5 * 60_000): Promise<Health> {
  const problems: string[] = [];
  let backendOk = true; let overdue = 0, failed = 0; let props: Health["properties"] = [];
  try {
    overdue = Number((await db.query<{ n: string }>(`select count(*)::text as n from runtime_jobs where state = 'queued' and run_at < $1::timestamptz - interval '15 minutes'`, [now])).rows[0]?.n ?? 0);
    failed = Number((await db.query<{ n: string }>(`select count(*)::text as n from runtime_jobs where state = 'failed'`)).rows[0]?.n ?? 0);
    props = (await db.query<{ property_id: string; cycles: number; updated_at: string }>(`select property_id, cycles, updated_at from property_models order by property_id`)).rows.map((r) => { const last = new Date(r.updated_at).toISOString(); const age = (Date.parse(now) - Date.parse(last)) / 3_600_000; return { id: r.property_id, cycles: Number(r.cycles), lastCycleAt: last, ageHours: Math.round(age * 10) / 10 }; });
  } catch (e) { backendOk = false; problems.push(`database: ${e instanceof Error ? e.message : String(e)}`); }
  if (overdue) problems.push(`${overdue} job(s) overdue by more than 15 minutes`);
  if (failed) problems.push(`${failed} job(s) failed for good`);
  for (const p of props) if (p.ageHours !== null && p.ageHours > maxCycleAgeHours) problems.push(`${p.id}: last cycle ${p.ageHours} h ago`);
  if (workerState.lastPollAt && Date.parse(now) - Date.parse(workerState.lastPollAt) > maxPollAgeMs) problems.push(`worker last polled ${workerState.lastPollAt}`);
  return { ok: backendOk && problems.length === 0, at: now, backend: db.backend, lastPollAt: workerState.lastPollAt, overdueJobs: overdue, failedJobs: failed, properties: props, problems };
}

/** GET /health → 200 when ok, 503 otherwise. No secrets, no data: counts and dates only. */
export function startHealthServer(db: SqlClient, port: number): Server {
  const server = createServer(async (req, res) => {
    if (req.url !== "/health") { res.writeHead(404); res.end(); return; }
    const h = await health(db);
    res.writeHead(h.ok ? 200 : 503, { "content-type": "application/json" }); res.end(JSON.stringify(h));
  });
  server.listen(port); return server;
}
