/**
 * Planner (T0) — étape 3. Sur `mandate.thesis_attached` (SEUL point où le `mandateId` existe, condition
 * des invariants non-nullables d'Objective/Task), dérive objectifs + tâches de la thèse attachée via
 * le paquet PUR `@anesis/planning`, puis les persiste et émet `objective.created` / `task.created`.
 * IDEMPOTENT : ne dérive qu'une fois par mandat (garde sur l'existence d'objectifs) — sûr au rejeu.
 */
import {
  gbp,
  iso,
  type LossLineId,
  type LossLineItem,
  type MandateId,
  type ObjectiveId,
  type TaskId,
  type ThesisId,
  type UnderwritingThesis,
} from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import { DEFAULT_PLANNING_CONFIG, derivePlan, type PlanningDeps } from "@anesis/planning";
import type { Agent, AgentContext } from "../types.js";
import { uid } from "../helpers.js";

async function loadThesis(ctx: AgentContext, thesisId: string): Promise<UnderwritingThesis | null> {
  const th = await ctx.client.query("select id, mandate_id, leak_index from theses where id = $1", [thesisId]);
  const row = th.rows[0];
  if (!row) return null;
  const ll = await ctx.client.query(
    "select id, thesis_id, pillar, annual_loss_pence, root_cause from loss_lines where thesis_id = $1 order by id",
    [thesisId],
  );
  const lossLines: LossLineItem[] = ll.rows.map((r) => ({
    id: asId<LossLineId>(String(r.id)),
    thesisId: asId<ThesisId>(String(r.thesis_id)),
    pillar: String(r.pillar),
    annualLoss: gbp(Number(r.annual_loss_pence)),
    rootCause: String(r.root_cause),
  }));
  return {
    id: asId<ThesisId>(String(row.id)),
    mandateId: asId<MandateId>(String(row.mandate_id)),
    leakIndex: Number(row.leak_index),
    lossLines,
    createdAt: iso(), // non ré-émis ni re-persisté ici
  };
}

async function onThesisAttached(ctx: AgentContext, thesisId: string): Promise<void> {
  await ctx.startRun();

  // Idempotence : si des objectifs existent déjà pour ce mandat, la dérivation a eu lieu → on s'arrête.
  const existing = await ctx.client.query("select 1 from objectives where mandate_id = $1 limit 1", [ctx.mandateId]);
  if (existing.rows.length > 0) {
    await ctx.completeRun(0, "measured");
    return;
  }

  const thesis = await loadThesis(ctx, thesisId);
  if (!thesis) {
    await ctx.completeRun(0, "measured");
    return;
  }

  const deps: PlanningDeps = {
    now: iso(),
    newThesisId: () => asId<ThesisId>(uid("th")),
    newLossLineId: () => asId<LossLineId>(uid("ll")),
    newObjectiveId: () => asId<ObjectiveId>(uid("obj")),
    newTaskId: () => asId<TaskId>(uid("task")),
  };
  const { objectives, tasks } = derivePlan(thesis, deps, DEFAULT_PLANNING_CONFIG);

  for (const o of objectives) {
    await ctx.client.query(
      "insert into objectives (id, mandate_id, loss_line_id, title, target_recovery_pence, state) values ($1, $2, $3, $4, $5, 'created')",
      [o.id, o.mandateId, o.lossLineId, o.title, o.targetRecovery.pence],
    );
    await ctx.emit("objective.created", { objectiveId: o.id, lossLineId: o.lossLineId, targetRecovery: o.targetRecovery });
  }
  for (const t of tasks) {
    await ctx.client.query(
      "insert into tasks (id, mandate_id, objective_id, assigned_agent, state, intent) values ($1, $2, $3, $4, 'created', $5)",
      [t.id, t.mandateId, t.objectiveId, t.assignedAgent, t.intent],
    );
    await ctx.emit("task.created", { taskId: t.id, objectiveId: t.objectiveId });
  }

  await ctx.completeRun(0, "measured");
}

export const planner: Agent = {
  id: "planner",
  events: ["mandate.thesis_attached"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "event" || ctx.trigger.type !== "mandate.thesis_attached") return;
    const payload = ctx.trigger.payload as { thesisId: string };
    await onThesisAttached(ctx, payload.thesisId);
  },
};
