import type { CycleResult } from "@anesis/engine";
import type { SqlClient } from "./sql.js";

export interface StoredCycle { readonly runId: string; readonly propertyId: string; readonly label: string; readonly at: string; readonly durationMs: number; readonly result: CycleResult }
const row = (r: Record<string, unknown>): StoredCycle => ({ runId: String(r.run_id), propertyId: String(r.property_id), label: String(r.label ?? ""), at: new Date(r.at as string).toISOString(), durationMs: Number(r.duration_ms ?? 0), result: (typeof r.result === "string" ? JSON.parse(r.result) : r.result) as CycleResult });

/** Full cycle results, persisted: observations, evidence chains, diagnosis, decision, records. What a contract cites can be re-read after a restart (C12). */
export async function saveCycleResult(db: SqlClient, c: { runId: string; propertyId: string; jobId?: number | null; label: string; at: string; durationMs: number; result: CycleResult }): Promise<void> {
  await db.query(`insert into cycle_results (run_id, property_id, job_id, label, duration_ms, at, result) values ($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict (property_id, run_id) do nothing`, [c.runId, c.propertyId, c.jobId ?? null, c.label, c.durationMs, c.at, JSON.stringify(c.result)]);
}
export async function loadCycleResult(db: SqlClient, propertyId: string, runId: string): Promise<StoredCycle | null> {
  const r = await db.query<Record<string, unknown>>(`select * from cycle_results where property_id = $1 and run_id = $2`, [propertyId, runId]);
  return r.rows[0] ? row(r.rows[0]) : null;
}
export async function listCycleResults(db: SqlClient, propertyId: string, limit = 50): Promise<StoredCycle[]> {
  return (await db.query<Record<string, unknown>>(`select * from cycle_results where property_id = $1 order by at desc, run_id desc limit $2`, [propertyId, limit])).rows.map(row);
}
