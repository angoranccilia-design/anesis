/**
 * Conversion (T1) — cible du planner (pilier `speed`). Sur `task.assigned` qui lui revient, produit une
 * RECOMMANDATION d'amélioration du parcours de réservation (artefact) et la pousse au mandant.
 * Régime T1 (immediate_post_review, §1a étape 4) : l'action part IMMÉDIATEMENT via `ctx.act`, le
 * `tool_call` est la trace d'audit, puis une NOTIFICATION de relecture a posteriori est émise.
 * IDEMPOTENT : une recommandation par tâche (garde sur l'artefact existant).
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext, ToolIntent } from "../types.js";
import { notify, uid } from "../helpers.js";

async function recommend(ctx: AgentContext, taskId: string): Promise<void> {
  await ctx.startRun();

  const existing = await ctx.client.query(
    "select 1 from artifacts where type = 'conversion_recommendation' and payload->>'taskId' = $1 limit 1",
    [taskId],
  );
  if (existing.rows.length > 0) {
    await ctx.completeRun(0, "measured"); // déjà recommandé pour cette tâche
    return;
  }

  const { rows } = await ctx.client.query("select objective_id from tasks where id = $1", [taskId]);
  const objectiveId = rows[0]?.objective_id as string | undefined;
  if (objectiveId == null) {
    await ctx.completeRun(0, "measured");
    return;
  }

  const artifactId = uid("art");
  const note =
    "Reduce booking-form friction: fewer fields, faster mobile load, and a clearer direct-rate advantage over OTAs.";
  const intent: ToolIntent = {
    name: "publish_conversion_reco",
    tier: "T1", // externe (poussée au mandant), exécution immédiate + relecture a posteriori
    input: { taskId, objectiveId },
    effect: async (client) => {
      await client.query(
        `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
         values ($1, $2, $3, 'conversion_recommendation', 1, $4::jsonb, 'produced')`,
        [artifactId, ctx.mandateId, ctx.runId, JSON.stringify({ taskId, objectiveId, note })],
      );
      return artifactId;
    },
  };

  const outcome = await ctx.act(intent);
  if (outcome.kind !== "allow") {
    await ctx.completeRun(0, "measured");
    return;
  }

  const eventId = await ctx.emit("artifact.produced", {
    artifactId: asId<ArtifactId>(artifactId),
    runId: ctx.runId,
    type: "conversion_recommendation",
  });
  // T1 — trace de relecture a posteriori (l'action est déjà partie).
  await notify(ctx, eventId, {
    what: "Conversion recommendation published",
    why: "Improve on-site direct-booking conversion",
    expectedAction: "Review the recommendation when you have a moment",
    priority: "normal",
  });

  await ctx.completeRun(0, "measured");
}

export const conversion: Agent = {
  id: "conversion",
  events: ["task.assigned"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event" || ctx.trigger.type !== "task.assigned") return;
    const p = ctx.trigger.payload as { taskId: string; agentId?: string };
    if (p.agentId !== "conversion") return; // pas ma tâche (ignore media-buyer, etc.)
    await recommend(ctx, p.taskId);
  },
};
