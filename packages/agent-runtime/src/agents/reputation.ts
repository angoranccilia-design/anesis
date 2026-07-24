/**
 * Reputation (T2) — répond aux avis. Cible du planner (pilier `reviews`) et réagit à
 * `external.review_received`. Régime T2 (retention_window §1b) : la réponse Google est PROGRAMMÉE dans
 * une fenêtre de 2h (alerte émise ; auto si personne n'intervient) via la retenue durable. Les sources
 * non automatisables (ex: TripAdvisor) → brouillon interne + notification (l'humain colle la réponse).
 * IDEMPOTENT : garde sur `reviews.responded_at`.
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { notify, uid } from "../helpers.js";
import { registerRetentionHandler } from "../retention.js";

const AUTO_REPLY_SOURCE = "google"; // seul Google se répond automatiquement (limite honnête, Partie 5)
const ACTION = "reply_review";
const COMPENSATION = "Delete the published Google review response";

// Handler de retenue : reconstruit l'action de publication de la réponse (effet stub côté adaptateur).
registerRetentionHandler(ACTION, (_ctx, input) => ({
  name: ACTION,
  tier: "T2",
  input,
  reversible: false,
  compensation: COMPENSATION,
  effect: async () => undefined, // publication réelle de la réponse via l'adaptateur (stub en test)
}));

async function onReview(ctx: AgentContext): Promise<void> {
  await ctx.startRun();
  const { rows } = await ctx.client.query(
    "select id, source from reviews where mandate_id = $1 and responded_at is null order by received_at desc limit 1",
    [ctx.mandateId],
  );
  const review = rows[0];
  if (!review) {
    await ctx.completeRun(0, "measured"); // rien à traiter
    return;
  }

  const reviewId = String(review.id);
  const draftedResponse = "Thank you for your feedback — we're grateful you chose to stay with us.";

  if (String(review.source) === AUTO_REPLY_SOURCE) {
    // marque tout de suite (idempotence : pas de double programmation), puis PROGRAMME la retenue T2.
    await ctx.client.query("update reviews set responded_at = now() where id = $1", [reviewId]);
    await ctx.scheduleRetention({ name: ACTION, input: { reviewId, response: draftedResponse }, compensation: COMPENSATION });
    const eventId = await ctx.emit("retention.scheduled", { runId: ctx.runId, actionName: ACTION });
    await notify(ctx, eventId, {
      what: "Google review reply scheduled (2-hour window)",
      why: "Auto-reply drafted for a new Google review",
      expectedAction: "Adjust or cancel within 2 hours if needed",
      priority: "normal",
    });
    return; // pas de completeRun : le run reste en retenue jusqu'au balayeur
  }

  // Source non automatisable (ex: TripAdvisor) : brouillon interne, l'humain colle la réponse.
  await ctx.client.query("update reviews set responded_at = now() where id = $1", [reviewId]);
  const artifactId = uid("art");
  await ctx.client.query(
    `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
     values ($1, $2, $3, 'review_response_draft', 1, $4::jsonb, 'produced')`,
    [artifactId, ctx.mandateId, ctx.runId, JSON.stringify({ reviewId, response: draftedResponse, source: review.source })],
  );
  const eventId = await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "review_response_draft" });
  await notify(ctx, eventId, {
    what: "Review reply drafted — manual posting needed",
    why: `${String(review.source)} does not support auto-replies`,
    expectedAction: "Copy the drafted reply and post it manually",
    priority: "normal",
  });
  await ctx.completeRun(0, "measured");
}

export const reputation: Agent = {
  id: "reputation",
  events: ["external.review_received"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event" || ctx.trigger.type !== "external.review_received") return;
    await onReview(ctx);
  },
};
