/**
 * Orchestrator (T0) — coordonne :
 *  - sur `measurement.deviation_detected` : crée deux Tasks (media-buyer, conversion) + notifications ;
 *  - sur `artifact.produced` de type budget_redeployment : met à jour l'Objective (le journal = le log
 *    d'événements corrélés) ;
 *  - sur `weekly.tick` : compose le rapport hebdomadaire à partir des événements de la semaine, sans
 *    qu'on le lui demande.
 */
import { asId } from "@anesis/core/unsafe";
import type { AgentId, ArtifactId, TaskId } from "@anesis/core";
import type { Agent, AgentContext } from "../types.js";
import { notify, uid } from "../helpers.js";

const ASSIGNMENTS: { agentId: AgentId; intent: string }[] = [
  { agentId: "media-buyer", intent: "Redeploy paid budget toward direct bookings" },
  { agentId: "conversion", intent: "Improve on-site booking conversion" },
];

async function onDeviation(ctx: AgentContext): Promise<void> {
  await ctx.startRun();
  const { rows } = await ctx.client.query("select id from objectives where mandate_id = $1 limit 1", [ctx.mandateId]);
  const objectiveId = rows[0]?.id as string | undefined;
  if (!objectiveId) {
    await ctx.completeRun(0, "measured");
    return;
  }

  for (const a of ASSIGNMENTS) {
    const taskId = uid("task");
    await ctx.client.query(
      "insert into tasks (id, mandate_id, objective_id, assigned_agent, state, intent) values ($1, $2, $3, $4, 'assigned', $5)",
      [taskId, ctx.mandateId, objectiveId, a.agentId, a.intent],
    );
    const eventId = await ctx.emit("task.assigned", { taskId: asId<TaskId>(taskId), agentId: a.agentId });
    await notify(ctx, eventId, {
      what: `New task for ${a.agentId}`,
      why: "Direct bookings 18% below plan",
      expectedAction: a.intent,
      priority: "normal",
    });
  }

  await ctx.completeRun(0, "measured");
}

/**
 * §2 (étape 4) — maillon planner → agents d'exécution. Le planner crée les tâches en `created` (avec
 * l'agent propriétaire) et émet `task.created`. L'ASSIGNATION reste la responsabilité de l'orchestrator
 * (elle pourra évoluer : charge, priorité) : il transite created → assigned et émet `task.assigned`,
 * l'événement que les agents d'exécution écoutent. Le planner reste une fonction PURE de dérivation.
 */
async function onTaskCreated(ctx: AgentContext, payload: { taskId: string }): Promise<void> {
  await ctx.startRun();
  const { rows } = await ctx.client.query("select assigned_agent, state from tasks where id = $1", [payload.taskId]);
  const row = rows[0];
  if (!row || row.state !== "created" || row.assigned_agent == null) {
    await ctx.completeRun(0, "measured"); // déjà assignée / introuvable → idempotent
    return;
  }
  await ctx.client.query("update tasks set state = 'assigned' where id = $1 and state = 'created'", [payload.taskId]);
  await ctx.emit("task.assigned", { taskId: asId<TaskId>(payload.taskId), agentId: row.assigned_agent as AgentId });
  await ctx.completeRun(0, "measured");
}

async function onArtifact(ctx: AgentContext, payload: { type?: string }): Promise<void> {
  if (payload.type !== "budget_redeployment") return; // ignore weekly_report → pas de boucle
  await ctx.startRun();
  await ctx.client.query("update objectives set state = 'active' where mandate_id = $1 and state = 'created'", [ctx.mandateId]);
  await ctx.completeRun(0, "measured");
}

async function weeklyReport(ctx: AgentContext): Promise<void> {
  await ctx.startRun();
  const { rows } = await ctx.client.query("select count(*)::int as n from events where mandate_id = $1", [ctx.mandateId]);
  const eventsThisWeek = Number(rows[0]?.n ?? 0);

  const artifactId = uid("art");
  await ctx.client.query(
    `insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state)
     values ($1, $2, $3, 'weekly_report', 1, $4::jsonb, 'produced')`,
    [artifactId, ctx.mandateId, ctx.runId, JSON.stringify({ eventsThisWeek })],
  );
  await ctx.emit("artifact.produced", { artifactId: asId<ArtifactId>(artifactId), runId: ctx.runId, type: "weekly_report" });
  await ctx.completeRun(0, "measured");
}

export const orchestrator: Agent = {
  id: "orchestrator",
  events: ["measurement.deviation_detected", "artifact.produced", "task.created"],
  ticks: ["weekly.tick"],
  run: async (ctx) => {
    if (ctx.trigger.kind === "tick") {
      await weeklyReport(ctx);
      return;
    }
    if (ctx.trigger.kind !== "event") return; // (jamais déclenché en contexte système)
    if (ctx.trigger.type === "measurement.deviation_detected") {
      await onDeviation(ctx);
      return;
    }
    if (ctx.trigger.type === "task.created") {
      await onTaskCreated(ctx, ctx.trigger.payload as { taskId: string });
      return;
    }
    if (ctx.trigger.type === "artifact.produced") {
      await onArtifact(ctx, ctx.trigger.payload as { type?: string });
    }
  },
};
