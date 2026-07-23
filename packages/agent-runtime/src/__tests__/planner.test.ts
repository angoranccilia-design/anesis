import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, MandateId, OperatorId, ThesisId } from "@anesis/core";
import { AgentRuntime, planner } from "../index.js";
import { closeTestDbs, makeDb, q } from "./harness.js";

afterEach(closeTestDbs);

const CORR = asId<CorrelationId>("corr-plan");
const M = asId<MandateId>("M");
const OP = asId<OperatorId>("op-cecilia");

/** Amorce un mandat avec une thèse ATTACHÉE (postes de perte), SANS objectifs — c'est le planner qui les crée. */
async function seedAttachedThesis(pg: SqlClient): Promise<void> {
  await pg.query(
    "insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','cecilia@anesis.co.uk','founder') on conflict (id) do nothing",
  );
  await withMandate(pg, "M", async () => {
    await pg.query("insert into properties (id,name,region,source) values ('prop-M','P M','South West','test')");
    await pg.query("insert into mandates (id,mandate_id,property_id) values ('M','M','prop-M')");
    await pg.query("insert into theses (id,mandate_id,leak_index) values ('th-M','M',68)");
    const lines: [string, string, number, string][] = [
      ["ll-speed", "speed", 3_000_000, "Slow site response"],
      ["ll-ota", "ota", 5_000_000, "OTA over-dependence"],
      ["ll-retgt", "retargeting", 4_000_000, "No retargeting"],
    ];
    for (const [id, pillar, pence, cause] of lines) {
      await pg.query(
        "insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,'M','th-M',$2,$3,$4)",
        [id, pillar, pence, cause],
      );
    }
  });
}

function thesisAttached(id: string): Parameters<EventBus["append"]>[0] {
  return makeEvent({
    id: asId<EventId>(id),
    type: "mandate.thesis_attached",
    payload: { mandateId: M, thesisId: asId<ThesisId>("th-M"), leakIndex: 68 },
    correlationId: CORR,
    mandateId: M,
    emittedBy: OP,
  });
}

describe("Planner (étape 3) — mandate.thesis_attached → objectifs + tâches dérivés", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedAttachedThesis(pg);
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(planner);
  });

  it("dérive 1 objectif + 1 tâche par poste de perte, tracés vers un £, routés vers le bon agent", async () => {
    await bus.append(thesisAttached("evt-thesis"));
    await rt.drain();

    // Un objectif par poste, target_recovery = annualLoss × recoverableFraction du pilier.
    const objectives = await q(pg, "M", "select loss_line_id, target_recovery_pence, state from objectives");
    const byLine = Object.fromEntries(objectives.map((o) => [o.loss_line_id, o]));
    expect(objectives).toHaveLength(3);
    expect(Number(byLine["ll-speed"]?.target_recovery_pence)).toBe(1_500_000); // 3,000,000 × 0.5
    expect(Number(byLine["ll-ota"]?.target_recovery_pence)).toBe(3_000_000); // 5,000,000 × 0.6
    expect(Number(byLine["ll-retgt"]?.target_recovery_pence)).toBe(2_400_000); // 4,000,000 × 0.6
    expect(objectives.every((o) => o.state === "created")).toBe(true);

    // Une tâche par objectif, routée vers l'agent propriétaire du pilier.
    const tasks = await q(
      pg,
      "M",
      "select t.assigned_agent, t.state, l.pillar from tasks t join objectives o on o.id = t.objective_id join loss_lines l on l.id = o.loss_line_id",
    );
    const agentByPillar = Object.fromEntries(tasks.map((t) => [t.pillar, t.assigned_agent]));
    expect(tasks).toHaveLength(3);
    expect(agentByPillar.speed).toBe("conversion");
    expect(agentByPillar.ota).toBe("rate-distribution");
    expect(agentByPillar.retargeting).toBe("media-buyer");
    expect(tasks.every((t) => t.state === "created")).toBe(true);

    // Événements de création émis (audit) + run planner clôturé.
    const created = await q(
      pg,
      "M",
      "select type, count(*)::int as n from events where type in ('objective.created','task.created') group by type order by type",
    );
    expect(Object.fromEntries(created.map((r) => [r.type, Number(r.n)]))).toEqual({
      "objective.created": 3,
      "task.created": 3,
    });
    const run = await q(pg, "M", "select status from agent_runs where agent_id = 'planner'");
    expect(run[0]?.status).toBe("completed");
  });

  it("est idempotent : un second mandate.thesis_attached ne duplique rien", async () => {
    await bus.append(thesisAttached("evt-thesis"));
    await rt.drain();
    // Deuxième attachement (nouvel id d'événement) : la garde « objectifs déjà présents » doit court-circuiter.
    await bus.append(thesisAttached("evt-thesis-2"));
    await rt.drain();

    const objectives = await q(pg, "M", "select count(*)::int as n from objectives");
    const tasks = await q(pg, "M", "select count(*)::int as n from tasks");
    expect(Number(objectives[0]?.n)).toBe(3);
    expect(Number(tasks[0]?.n)).toBe(3);
  });
});
