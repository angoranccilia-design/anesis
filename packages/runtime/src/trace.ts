import type { SqlClient } from "./sql.js";
export interface Trace { jobId?: number | null; runId?: string | null; propertyId?: string | null; kind: "job" | "engine" | "connector" | "model"; type: string; state?: string | null; detail?: string | null; at?: string; durationMs?: number | null; costGbp?: number | null }
/** Every step the runtime takes is a row. The indicator "cost per problem correctly solved" is computed from these rows, nowhere else. */
export async function trace(db: SqlClient, t: Trace): Promise<void> {
  await db.query(`insert into runtime_traces (job_id, run_id, property_id, kind, type, state, detail, at, duration_ms, cost_gbp) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [t.jobId ?? null, t.runId ?? null, t.propertyId ?? null, t.kind, t.type, t.state ?? null, t.detail ?? null, t.at ?? new Date().toISOString(), t.durationMs ?? null, t.costGbp ?? null]);
}
export async function tracesFor(db: SqlClient, runId: string): Promise<Record<string, unknown>[]> { return (await db.query(`select * from runtime_traces where run_id = $1 order by id`, [runId])).rows; }
