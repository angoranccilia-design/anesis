/**
 * Lifecycle (T3) — prépare les séquences email vers les clients de l'établissement. Action T3
 * (blocking_approval) : rien ne part sans l'accord humain. Sur `task.assigned` qui lui revient, il
 * PROPOSE la séquence (crée l'Approval, notifie, suspend) ; sur `human.approval_granted`, il l'active.
 * Réutilise le pattern d'approbation partagé (garde d'appartenance incluse).
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { uid } from "../helpers.js";
import { requestApproval, resumeOnApproval } from "./approval.js";

const ACTION = "prepare_email_sequence";
const COMPENSATION = "Désactiver la séquence email (arrêt programmatique)";

async function propose(ctx: AgentContext): Promise<void> {
  const runId = await ctx.startRun();
  await requestApproval(ctx, {
    runId,
    actionName: ACTION,
    tier: "T3",
    input: {},
    reversible: true,
    compensation: COMPENSATION,
    reason: "Prepare a guest lifecycle email sequence to lift repeat bookings",
    notifyWhat: "Guest email sequence awaiting your approval",
    expectedAction: "Approve or deny the guest lifecycle email sequence",
  });
}

async function execute(ctx: AgentContext, approvalId: string): Promise<void> {
  const artifactId = uid("art");
  await resumeOnApproval(ctx, approvalId, {
    actionName: ACTION,
    tier: "T3",
    humanMinutes: 2, // temps de décision humaine
    reversible: true,
    compensation: COMPENSATION,
    effect: async (client, approval) => {
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'email_sequence', 1, '{}'::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, approval.runId],
      );
    },
    onAllowed: async () => {
      await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "email_sequence" });
    },
  });
}

export const lifecycle: Agent = {
  id: "lifecycle",
  events: ["task.assigned", "human.approval_granted"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event") return;
    if (ctx.trigger.type === "task.assigned") {
      const p = ctx.trigger.payload as { agentId?: string };
      if (p.agentId !== "lifecycle") return;
      await propose(ctx);
      return;
    }
    if (ctx.trigger.type === "human.approval_granted") {
      await execute(ctx, (ctx.trigger.payload as { approvalId: string }).approvalId);
    }
  },
};
