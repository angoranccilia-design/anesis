/**
 * Content Creator (T5) — rédige textes, calendrier, briefs de production. Action T5 (blocking_approval,
 * touche à la voix de marque) : accord humain obligatoire. Sur sa `task.assigned`, propose le contenu ;
 * au grant, produit l'artefact `content` (que la fondatrice a validé). Cet artefact, une fois approuvé,
 * est ensuite publié par social-ops. Réutilise le pattern d'approbation partagé.
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { uid } from "../helpers.js";
import { requestApproval, resumeOnApproval } from "./approval.js";

const ACTION = "produce_content";
const COMPENSATION = "Retirer le contenu produit (non publié)";

async function propose(ctx: AgentContext): Promise<void> {
  const runId = await ctx.startRun();
  await requestApproval(ctx, {
    runId,
    actionName: ACTION,
    tier: "T5",
    input: {},
    reversible: true,
    compensation: COMPENSATION,
    reason: "Produce brand copy, calendar and production briefs for the mandate",
    notifyWhat: "Content awaiting your approval",
    expectedAction: "Approve or deny the produced content",
  });
}

async function execute(ctx: AgentContext, approvalId: string): Promise<void> {
  const artifactId = uid("art");
  await resumeOnApproval(ctx, approvalId, {
    actionName: ACTION,
    tier: "T5",
    humanMinutes: 5,
    reversible: true,
    compensation: COMPENSATION,
    effect: async (client, approval) => {
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'content', 1, '{}'::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, approval.runId],
      );
    },
    onAllowed: async () => {
      await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "content" });
    },
  });
}

export const contentCreator: Agent = {
  id: "content-creator",
  events: ["task.assigned", "human.approval_granted"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event") return;
    if (ctx.trigger.type === "task.assigned") {
      const p = ctx.trigger.payload as { agentId?: string };
      if (p.agentId !== "content-creator") return;
      await propose(ctx);
      return;
    }
    if (ctx.trigger.type === "human.approval_granted") {
      await execute(ctx, (ctx.trigger.payload as { approvalId: string }).approvalId);
    }
  },
};
