/**
 * Social Ops (T1) — publie le contenu DÉJÀ APPROUVÉ. Sur `artifact.approved`, si l'artefact est du
 * contenu publiable, il le publie via l'adaptateur social (injecté, stub en test) et enregistre la
 * publication (table `publications`). Régime T1 (§1a) : publication IMMÉDIATE via `ctx.act` (tool_call
 * = trace), puis notification de relecture a posteriori + événement `content.published` (audit).
 * IDEMPOTENT : ne republie pas un artefact déjà publié.
 */
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId } from "@anesis/core";
import type { Agent, AgentContext, ToolIntent } from "../types.js";
import { notify, uid } from "../helpers.js";

const PUBLISHABLE_TYPES = new Set(["content"]); // seul le contenu (issu de content-creator) se publie
const CHANNEL = "buffer"; // adaptateur de publication (injecté au réel plus tard)

async function publish(ctx: AgentContext, artifactId: string): Promise<void> {
  await ctx.startRun();

  const { rows } = await ctx.client.query("select type from artifacts where id = $1", [artifactId]);
  const type = rows[0]?.type as string | undefined;
  if (type == null || !PUBLISHABLE_TYPES.has(type)) {
    await ctx.completeRun(0, "measured"); // pas un artefact publiable → on ignore
    return;
  }

  const dup = await ctx.client.query("select 1 from publications where artifact_id = $1 limit 1", [artifactId]);
  if (dup.rows.length > 0) {
    await ctx.completeRun(0, "measured"); // déjà publié
    return;
  }

  const publicationId = uid("pub");
  const intent: ToolIntent = {
    name: "publish_content",
    tier: "T1", // externe (publication), exécution immédiate + relecture a posteriori
    input: { artifactId, channel: CHANNEL },
    effect: async (client) => {
      await client.query(
        "insert into publications (id, mandate_id, artifact_id, channel, external_ref) values ($1, $2, $3, $4, $5)",
        [publicationId, ctx.mandateId, artifactId, CHANNEL, `ext-${publicationId}`],
      );
      return publicationId;
    },
  };

  const outcome = await ctx.act(intent);
  if (outcome.kind !== "allow") {
    await ctx.completeRun(0, "measured");
    return;
  }

  const eventId = await ctx.emit("content.published", { artifactId: asId<ArtifactId>(artifactId), channel: CHANNEL });
  await notify(ctx, eventId, {
    what: "Approved content published",
    why: `Content went live on ${CHANNEL}`,
    expectedAction: "Check the live post when you have a moment",
    priority: "normal",
  });

  await ctx.completeRun(0, "measured");
}

export const socialOps: Agent = {
  id: "social-ops",
  events: ["artifact.approved"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event" || ctx.trigger.type !== "artifact.approved") return;
    const p = ctx.trigger.payload as { artifactId: string };
    await publish(ctx, p.artifactId);
  },
};
