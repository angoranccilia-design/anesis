import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { AgentId, CorrelationId, EventId, MandateId, TaskId } from "@anesis/core";
import { AgentRuntime, conversion } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-conv");

async function seedTask(pg: SqlClient, taskId: string, agent: string): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query(
      "insert into tasks (id, mandate_id, objective_id, assigned_agent, state, intent) values ($1,'M','obj-M',$2,'assigned','Improve conversion')",
      [taskId, agent],
    );
  });
}

function taskAssigned(id: string, taskId: string, agent: string): Parameters<EventBus["append"]>[0] {
  return makeEvent({
    id: asId<EventId>(id),
    type: "task.assigned",
    payload: { taskId: asId<TaskId>(taskId), agentId: agent as AgentId },
    correlationId: CORR,
    mandateId: M,
    emittedBy: "orchestrator",
  });
}

describe("Conversion (T1) — recommandation immédiate + trace de relecture", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(conversion);
  });

  it("sur sa tâche : produit la reco (T1, exécutée tout de suite) + notifie pour relecture", async () => {
    await seedTask(pg, "task-c", "conversion");
    await bus.append(taskAssigned("evt-1", "task-c", "conversion"));
    await rt.drain();

    const arts = await q(pg, "M", "select payload->>'taskId' as task_id, state from artifacts where type='conversion_recommendation'");
    expect(arts).toHaveLength(1);
    expect(arts[0]?.task_id).toBe("task-c");

    // T1 = exécution immédiate : le tool_call est écrit (trace d'audit), sans retenue.
    const tc = await q(pg, "M", "select tier, retention_started_at from tool_calls where name='publish_conversion_reco'");
    expect(tc).toHaveLength(1);
    expect(tc[0]?.tier).toBe("T1");
    expect(tc[0]?.retention_started_at).toBeNull();

    // Trace de relecture a posteriori.
    const notifs = await q(pg, "M", "select count(*)::int as n from notifications");
    expect(Number(notifs[0]?.n)).toBe(1);

    const run = await q(pg, "M", "select status from agent_runs where agent_id='conversion'");
    expect(run[0]?.status).toBe("completed");
  });

  it("ignore une tâche qui ne lui est pas destinée", async () => {
    await seedTask(pg, "task-mb", "media-buyer");
    await bus.append(taskAssigned("evt-2", "task-mb", "media-buyer"));
    await rt.drain();
    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='conversion_recommendation'");
    expect(Number(arts[0]?.n)).toBe(0);
  });

  it("est idempotent : une seconde assignation de la même tâche ne duplique pas la reco", async () => {
    await seedTask(pg, "task-c", "conversion");
    await bus.append(taskAssigned("evt-1", "task-c", "conversion"));
    await rt.drain();
    await bus.append(taskAssigned("evt-1b", "task-c", "conversion"));
    await rt.drain();
    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='conversion_recommendation'");
    expect(Number(arts[0]?.n)).toBe(1);
  });
});
