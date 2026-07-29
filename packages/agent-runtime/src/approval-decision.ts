/**
 * Décision humaine sur une approbation bloquante (T3/T4/T5) : grant ou deny, par la fondatrice ou un
 * operator délégué. C'est LE point où la règle « qui peut approuver » s'applique (canApproveTier +
 * délégation), en complément d'`authorize()` qui, lui, ne juge que le régime et la validité de l'Approval.
 *
 * L'agent concerné est déduit du run de l'approbation (`agent_runs.agent_id`). L'écriture se fait dans
 * le CONTEXTE DU MANDAT (withMandate) — le founder peut décider pour tout mandat, mais l'écriture reste
 * cloisonnée. La reprise effective de l'action (resumeOnApproval) reste déclenchée par l'agent au grant.
 */
import { canApproveTier, type AgentId, type Operator } from "@anesis/core";
import { withMandate, type SqlClient } from "@anesis/db";

/** Agents supervisés par un operator (table globale operator_agent_assignments). */
export async function loadSupervisedAgents(client: SqlClient, operatorId: string): Promise<AgentId[]> {
  const { rows } = await client.query("select agent_id from operator_agent_assignments where operator_id = $1", [operatorId]);
  return rows.map((r) => String(r.agent_id) as AgentId);
}

export type DecideApprovalResult =
  | { readonly ok: true; readonly status: "granted" | "denied" }
  | { readonly ok: false; readonly code: "not_found" | "not_pending" | "forbidden" };

export interface DecideApprovalInput {
  readonly mandateId: string;
  readonly approvalId: string;
  readonly operator: Operator;
  readonly decision: "grant" | "deny";
}

/**
 * Applique une décision. Refuse (`forbidden`) si l'opérateur n'a pas l'autorité : le founder approuve
 * tout ; un operator seulement les agents qu'il supervise (T5 art-director inclus s'il est assigné).
 */
export async function decideApproval(client: SqlClient, input: DecideApprovalInput): Promise<DecideApprovalResult> {
  const supervises = input.operator.role === "founder" ? [] : await loadSupervisedAgents(client, input.operator.id);

  return withMandate(client, input.mandateId, async () => {
    const row = (
      await client.query(
        `select a.tier, a.status, ar.agent_id
         from approvals a join agent_runs ar on ar.id = a.run_id
         where a.id = $1`,
        [input.approvalId],
      )
    ).rows[0];

    if (!row) return { ok: false, code: "not_found" };
    if (row.status !== "pending") return { ok: false, code: "not_pending" };

    const tier = String(row.tier) as Parameters<typeof canApproveTier>[1];
    const agentId = String(row.agent_id) as AgentId;
    if (!canApproveTier(input.operator, tier, { agentId, supervises })) {
      return { ok: false, code: "forbidden" };
    }

    const status = input.decision === "grant" ? "granted" : "denied";
    await client.query("update approvals set status = $1, decided_by = $2, decided_at = now() where id = $3", [
      status,
      input.operator.id,
      input.approvalId,
    ]);
    return { ok: true, status };
  });
}
