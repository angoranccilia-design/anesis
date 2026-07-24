/**
 * Art Director / « Creative Director » (T5, INTERNE) — propose la direction visuelle par mandat, à la
 * signature (`mandate.thesis_attached`). Produit un ARTEFACT INTERNE (moodboard/identité) JAMAIS publié
 * directement : son adoption exige la validation de la Directrice Artistique / fondatrice → régime T5
 * (blocking_approval). Réutilise le pattern d'approbation partagé.
 * IDEMPOTENT : une seule direction créative par mandat. Alimente ensuite content-creator.
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { uid } from "../helpers.js";
import { requestApproval, resumeOnApproval } from "./approval.js";

const ACTION = "propose_creative_direction";
const COMPENSATION = "Abandonner la direction créative proposée (jamais publiée)";

async function propose(ctx: AgentContext): Promise<void> {
  // une seule direction par mandat : si une approbation existe déjà (quel que soit son statut), on s'arrête.
  const existing = await ctx.client.query(
    "select 1 from approvals where mandate_id = $1 and tool_call_name = $2 limit 1",
    [ctx.mandateId, ACTION],
  );
  if (existing.rows.length > 0) return;

  const runId = await ctx.startRun();
  await requestApproval(ctx, {
    runId,
    actionName: ACTION,
    tier: "T5",
    input: {},
    reversible: true,
    compensation: COMPENSATION,
    reason: "Propose the visual direction & trend read for this mandate (internal, never published)",
    notifyWhat: "Creative direction awaiting your validation",
    expectedAction: "Validate or revise the proposed creative direction",
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
      // Artefact INTERNE (type creative_direction) : social-ops ne publie que 'content' → jamais publié.
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'creative_direction', 1, '{}'::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, approval.runId],
      );
    },
    onAllowed: async () => {
      await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "creative_direction" });
    },
  });
}

export const artDirector: Agent = {
  id: "art-director",
  events: ["mandate.thesis_attached", "human.approval_granted"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event") return;
    if (ctx.trigger.type === "mandate.thesis_attached") {
      await propose(ctx);
      return;
    }
    if (ctx.trigger.type === "human.approval_granted") {
      await execute(ctx, (ctx.trigger.payload as { approvalId: string }).approvalId);
    }
  },
};
