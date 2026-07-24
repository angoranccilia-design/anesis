/**
 * Rate & Distribution (T4) — surveille la parité tarifaire et propose la stratégie de distribution.
 * Cible du planner (pilier `ota`) ET réagit à `external.rate_parity_broken`. Action T4
 * (blocking_approval, argent/prix) : approbation humaine obligatoire. Réutilise le pattern partagé.
 * Garde anti-double-approbation : une seule Approval en attente à la fois pour cette action.
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { uid } from "../helpers.js";
import { requestApproval, resumeOnApproval } from "./approval.js";

const ACTION = "adjust_distribution";
const COMPENSATION = "Revert the distribution/parity change";

async function propose(ctx: AgentContext, reason: string): Promise<void> {
  const pending = await ctx.client.query(
    "select 1 from approvals where mandate_id = $1 and tool_call_name = $2 and status = 'pending' limit 1",
    [ctx.mandateId, ACTION],
  );
  if (pending.rows.length > 0) return; // déjà une approbation en cours → idempotent

  const runId = await ctx.startRun();
  await requestApproval(ctx, {
    runId,
    actionName: ACTION,
    tier: "T4",
    input: {},
    reversible: true,
    compensation: COMPENSATION,
    reason,
    notifyWhat: "Distribution / rate-parity change awaiting your approval",
    expectedAction: "Approve or deny the distribution change",
  });
}

async function execute(ctx: AgentContext, approvalId: string): Promise<void> {
  const artifactId = uid("art");
  await resumeOnApproval(ctx, approvalId, {
    actionName: ACTION,
    tier: "T4",
    humanMinutes: 3,
    reversible: true,
    compensation: COMPENSATION,
    effect: async (client, approval) => {
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'distribution_change', 1, '{}'::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, approval.runId],
      );
    },
    onAllowed: async () => {
      await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "distribution_change" });
    },
  });
}

export const rateDistribution: Agent = {
  id: "rate-distribution",
  events: ["external.rate_parity_broken", "task.assigned", "human.approval_granted"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event") return;
    if (ctx.trigger.type === "external.rate_parity_broken") {
      const p = ctx.trigger.payload as { channel?: string };
      await propose(ctx, `Rate parity broken on ${p.channel ?? "a channel"} — rebalance channel mix`);
      return;
    }
    if (ctx.trigger.type === "task.assigned") {
      const p = ctx.trigger.payload as { agentId?: string };
      if (p.agentId !== "rate-distribution") return;
      await propose(ctx, "Rebalance channel mix & protect rate parity");
      return;
    }
    if (ctx.trigger.type === "human.approval_granted") {
      await execute(ctx, (ctx.trigger.payload as { approvalId: string }).approvalId);
    }
  },
};
