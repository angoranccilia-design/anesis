import { prepareInterventions, transition, originIntact, type InterventionContract, type TransitionInput } from "@anesis/execution";
import { sha256Hex, observedChange, type CycleResult, type OpenIntervention } from "@anesis/engine";
import { latestImport } from "./imports.js";
import type { SqlClient } from "./sql.js";
import { trace } from "./trace.js";

const COMMITTED = ["AUTHORISED", "IN_EXECUTION", "EXECUTED", "MEASURED"] as const;
const PENDING = ["PREPARED", "SUBMITTED"] as const;
export interface PendingContract { readonly contractId: string; readonly interventionId: string; readonly state: string; readonly decisionStatus: string }

/**
 * What the next cycle must know about earlier contracts (audit C6). Committed ones (a human has authorised them) come back
 * as OpenIntervention for the engine, which marks them IN_PROGRESS instead of re-proposing them. Pending ones (prepared or
 * submitted, no human decision yet) are kept so the same proposal is not duplicated, or withdrawn when the decision moves.
 */
export async function openInterventions(db: SqlClient, propertyId: string): Promise<{ committed: OpenIntervention[]; pending: PendingContract[] }> {
  const r = await db.query<{ id: string; intervention_id: string; state: string; contract: unknown }>(`select id, intervention_id, state, contract from interventions where property_id = $1 and state not in ('CLOSED','REJECTED','WITHDRAWN') order by prepared_at, id`, [propertyId]);
  const committed: OpenIntervention[] = [], pending: PendingContract[] = [];
  for (const row of r.rows) {
    const c = (typeof row.contract === "string" ? JSON.parse(row.contract) : row.contract) as InterventionContract;
    if ((COMMITTED as readonly string[]).includes(row.state)) committed.push({ interventionId: row.intervention_id, contractId: row.id, state: row.state, budgetStatus: c.budgetStatus, approvedGbp: c.approvedCost.amountGbp, since: c.history.at(-1)?.at ?? c.decisionPackageRef.preparedAt, planId: c.measurement.preregistration?.planId ?? null, awaitingMeasurement: row.state === "EXECUTED" });
    else if ((PENDING as readonly string[]).includes(row.state)) pending.push({ contractId: row.id, interventionId: row.intervention_id, state: row.state, decisionStatus: c.decisionStatus });
  }
  return { committed, pending };
}

/**
 * Contracts prepared after a cycle are persisted once per (run, intervention); re-preparing the same run is a no-op. A pending
 * contract for the same intervention and the same decision is kept, not duplicated; one whose decision has moved is withdrawn
 * by the engine (nothing was committed) and replaced. Interventions in progress get no new contract: the engine did not propose them.
 */
export async function persistPrepared(db: SqlClient, r: CycleResult, runId: string, preparedAt: string, jobId: number | null = null, pending: readonly PendingContract[] = []): Promise<InterventionContract[]> {
  const contracts = prepareInterventions(r, runId, preparedAt);
  const kept: InterventionContract[] = [];
  for (const c of contracts) {
    const p = pending.find((x) => x.interventionId === c.decisionPackageRef.interventionId);
    if (p && p.decisionStatus === c.decisionStatus) {
      await trace(db, { jobId, runId, propertyId: c.propertyId, kind: "job", type: "INTERVENTION_PENDING_KEPT", state: p.state, detail: `${p.contractId} (${p.decisionStatus}) still awaits a human decision; ${c.id} not created — no duplicate proposal`, at: preparedAt });
      continue;
    }
    if (p) await transitionIntervention(db, p.contractId, { to: "WITHDRAWN", actor: { by: "engine", human: false, at: preparedAt }, note: `superseded by ${runId}: ${c.decisionPackageRef.interventionId} is now ${c.decisionStatus}` });
    const ins = await db.query<{ id: string }>(`insert into interventions (id, property_id, run_id, intervention_id, state, version, origin_sha256, contract, prepared_at) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) on conflict (id) do nothing returning id`,
      [c.id, c.propertyId, runId, c.decisionPackageRef.interventionId, c.state, c.version, c.originSha256, JSON.stringify(c), preparedAt]);
    if (ins.rows[0]) await trace(db, { jobId, runId, propertyId: c.propertyId, kind: "job", type: "INTERVENTION_PREPARED", state: c.decisionStatus, detail: `${c.id}: ${c.deliverables.map((d) => d.kind).join(", ") || "no deliverable"}; approval L${c.approvalLevel}; origin ${c.originSha256.slice(0, 12)}`, at: preparedAt });
    kept.push(c);
  }
  return kept;
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
  const upd = await db.query<{ id: string }>(`update interventions set state = $2, version = $3, contract = $4::jsonb, updated_at = now() where id = $1 and version = $5 returning id`, [id, contract.state, contract.version, JSON.stringify(contract), c.version]);
  if (!upd.rows.length) throw new Error(`${id}: concurrent update — the contract moved to another version since it was read; reload and retry`);   // C5: a lost update is an error, never silence
  await trace(db, { runId: c.decisionPackageRef.runId, propertyId: c.propertyId, kind: "job", type: "INTERVENTION_TRANSITION", state: contract.state, detail: `${id}: ${c.state} → ${contract.state} by ${t.actor.by}${t.actor.human ? " (human)" : ""}${t.evidence?.length ? " evidence: " + t.evidence.join(", ") : ""}`, at: t.actor.at });
  return contract;
}

/** MEASURED from the property's own history: the latest import's weekly series, the contract's execution date, the contract's observation window. Never a simulated outcome. */
export async function measureIntervention(db: SqlClient, id: string, actor: { by: string; human: boolean; at: string }, windowWeeks?: number): Promise<InterventionContract> {
  const c = await loadIntervention(db, id); if (!c) throw new Error(`${id}: not found`);
  if (!c.execution.executedAt) throw new Error(`${id}: not executed yet; nothing to measure`);
  const imp = await latestImport(db, c.propertyId); if (!imp || !imp.weekly.length) throw new Error(`${id}: no PMS import with a weekly history for ${c.propertyId}; import an export covering the post-execution weeks first`);
  const weeks = windowWeeks ?? c.observationWindowWeeks ?? 8;
  const observed = observedChange({ weekly: imp.weekly, executedAt: c.execution.executedAt, windowWeeks: weeks }, actor.at);
  return transitionIntervention(db, id, { to: "MEASURED", actor, observed, note: `measured on import ${imp.provenance.sha256.slice(0, 12)} (${imp.weekly.length} weeks)` });
}
