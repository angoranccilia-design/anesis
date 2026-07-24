/**
 * Media Buyer (T4) — sur `task.assigned` (sa tâche) : propose un redéploiement de budget. Comme c'est
 * une action T4 (argent), `authorize()` renvoie `require_approval` : l'agent crée l'Approval, émet
 * `human.approval_requested` + notification, et met son run en attente.
 * Sur `human.approval_granted` : reprend le run, rejoue `act()` avec l'Approval → autorisé → exécute,
 * puis clôt le run avec `human_minutes_spent` (le temps de décision humaine).
 */
import { iso } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import type { Approval, ApprovalId, ArtifactId, MandateId, OperatorId, AgentRunId } from "@anesis/core";
import type { Agent, AgentContext, ToolIntent } from "../types.js";
import { notify, uid } from "../helpers.js";

const AMOUNT_PENCE = 400_000; // £4,000
const COMPENSATION = "Mettre la campagne en pause (annulation programmatique)";

async function propose(ctx: AgentContext): Promise<void> {
  const runId = await ctx.startRun();

  const intent: ToolIntent = {
    name: "redeploy_budget",
    tier: "T4",
    input: { amountPence: AMOUNT_PENCE },
    reversible: true,
    compensation: COMPENSATION,
    effect: async () => undefined, // rien ne s'exécute tant que non approuvé
  };

  const outcome = await ctx.act(intent); // T4 sans Approval → require_approval
  if (outcome.kind !== "require_approval") return;

  const approvalId = uid("appr");
  await ctx.client.query(
    `insert into approvals (id, mandate_id, run_id, tool_call_name, tier, reason, amount_pence, status, expires_at)
     values ($1, $2, $3, 'redeploy_budget', 'T4', 'Direct bookings 18% below plan', $4, 'pending', now() + interval '48 hours')`,
    [approvalId, ctx.mandateId, runId, AMOUNT_PENCE],
  );

  const eventId = await ctx.emit("human.approval_requested", {
    approvalId: asId<ApprovalId>(approvalId),
    runId,
    amount: { currency: "GBP", pence: AMOUNT_PENCE },
  });

  await notify(ctx, eventId, {
    what: "Budget redeployment awaiting your approval",
    why: "Direct bookings 18% below plan",
    expectedAction: `Approve or deny the £${AMOUNT_PENCE / 100} redeployment`,
    deadline: null,
    priority: "high",
  });

  await ctx.suspendForApproval();
}

async function execute(ctx: AgentContext, payload: { approvalId: string }): Promise<void> {
  const { rows } = await ctx.client.query("select * from approvals where id = $1", [payload.approvalId]);
  const row = rows[0];
  // garde d'appartenance : n'exécute QUE sa propre approbation (coexistence multi-agents, étape 4)
  if (!row || row.status !== "granted" || row.tool_call_name !== "redeploy_budget") return;

  await ctx.resumeRun(row.run_id as AgentRunId);

  const approval: Approval = {
    id: asId<ApprovalId>(String(row.id)),
    mandateId: asId<MandateId>(String(row.mandate_id)),
    runId: row.run_id as AgentRunId,
    toolCallName: String(row.tool_call_name),
    tier: "T4",
    reason: String(row.reason),
    payload: {},
    amount: row.amount_pence != null ? { currency: "GBP", pence: Number(row.amount_pence) } : null,
    status: "granted",
    requestedAt: iso(row.requested_at as string | Date),
    expiresAt: row.expires_at != null ? iso(row.expires_at as string | Date) : null,
    decidedBy: asId<OperatorId>(String(row.decided_by)),
    decidedAt: iso(row.decided_at as string | Date),
  };

  const artifactId = uid("art");
  const intent: ToolIntent = {
    name: "redeploy_budget",
    tier: "T4",
    input: { amountPence: Number(row.amount_pence) },
    reversible: true,
    compensation: COMPENSATION,
    approval,
    effect: async (client) => {
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'budget_redeployment', 1, '{}'::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, approval.runId],
      );
      return artifactId;
    },
  };

  const outcome = await ctx.act(intent); // Approval valide → allow → exécute l'effet + écrit le tool_call
  if (outcome.kind !== "allow") return;

  await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: approval.runId, type: "budget_redeployment" });
  await ctx.completeRun(3, "measured"); // 3 minutes humaines : le temps de décider l'approbation
}

export const mediaBuyer: Agent = {
  id: "media-buyer",
  events: ["task.assigned", "human.approval_granted"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event") return;
    if (ctx.trigger.type === "task.assigned") {
      const p = ctx.trigger.payload as { agentId?: string };
      if (p.agentId !== "media-buyer") return; // ignore la tâche de conversion
      await propose(ctx);
      return;
    }
    if (ctx.trigger.type === "human.approval_granted") {
      await execute(ctx, ctx.trigger.payload as { approvalId: string });
    }
  },
};
