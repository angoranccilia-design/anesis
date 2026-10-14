import { prepareInterventions, transition, originIntact, type InterventionContract, type TransitionInput } from "@anesis/execution";
import { sha256Hex, type CycleResult } from "@anesis/engine";
import type { SqlClient } from "./sql.js";
import { trace } from "./trace.js";

/** Contracts prepared after a cycle are persisted once per (run, intervention); re-preparing the same run is a no-op. */
export async function persistPrepared(db: SqlClient, r: CycleResult, runId: string, preparedAt: string, jobId: number | null = null): Promise<InterventionContract[]> {
  const contracts = prepareInterventions(r, runId, preparedAt);
  for (const c of contracts) {
    const ins = await db.query<{ id: string }>(`insert into interventions (id, property_id, run_id, intervention_id, state, version, origin_sha256, contract, prepared_at) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) on conflict (id) do nothing returning id`,
      [c.id, c.propertyId, runId, c.decisionPackageRef.interventionId, c.state, c.version, c.originSha256, JSON.stringify(c), preparedAt]);
    if (ins.rows[0]) await trace(db, { jobId, runId, propertyId: c.propertyId, kind: "job", type: "INTERVENTION_PREPARED", state: c.decisionStatus, detail: `${c.id}: ${c.deliverables.map((d) => d.kind).join(", ") || "no deliverable"}; approval L${c.approvalLevel}; origin ${c.originSha256.slice(0, 12)}`, at: preparedAt });
  }
  return contracts;
}

export async function loadIntervention(db: SqlClient, id: string): Promise<InterventionContract | null> {
  const r = await db.query<{ contract: unknown }>(`select contract from interventions where id = $1`, [id]); const row = r.rows[0]; if (!row) return null;
  const c = (typeof row.contract === "string" ? JSON.parse(row.contract) : row.contract) as InterventionContract;
  if (!originIntact(c, sha256Hex)) throw new Error(`${id}: stored contract no longer matches its origin hash`);
  return c;
}

export async function listInterventions(db: SqlClient, propertyId: string): Promise<{ id: string; state: string; version: number; interventionId: string; runId: string }[]> {
  return (await db.query<{ id: string; state: string; version: number; intervention_id: string; run_id: string }>(`select id, state, version, intervention_id, run_id from interventions where property_id = $1 order by prepared_at desc, id`, [propertyId])).rows.map((x) => ({ id: x.id, state: x.state, version: Number(x.version), interventionId: x.intervention_id, runId: x.run_id }));
}

/** The only write path after preparation: a governed transition, persisted with its history and traced. */
export async function transitionIntervention(db: SqlClient, id: string, t: TransitionInput): Promise<InterventionContract> {
  const c = await loadIntervention(db, id); if (!c) throw new Error(`${id}: not found`);
  const { contract } = transition(c, t);
  await db.query(`update interventions set state = $2, version = $3, contract = $4::jsonb, updated_at = now() where id = $1 and version = $5`, [id, contract.state, contract.version, JSON.stringify(contract), c.version]);
  await trace(db, { runId: c.decisionPackageRef.runId, propertyId: c.propertyId, kind: "job", type: "INTERVENTION_TRANSITION", state: contract.state, detail: `${id}: ${c.state} → ${contract.state} by ${t.actor.by}${t.actor.human ? " (human)" : ""}${t.evidence?.length ? " evidence: " + t.evidence.join(", ") : ""}`, at: t.actor.at });
  return contract;
}
