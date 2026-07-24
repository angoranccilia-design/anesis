import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { AgentId, ApprovalId, CorrelationId, EventId, MandateId, OperatorId, TaskId } from "@anesis/core";
import { AgentRuntime, lifecycle } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-life");
const OP = asId<OperatorId>("op-cecilia");

async function seedTask(pg: SqlClient): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query(
      "insert into tasks (id, mandate_id, objective_id, assigned_agent, state, intent) values ('task-l','M','obj-M','lifecycle','assigned','Prepare guest email sequence')",
    );
  });
}

describe("Lifecycle (T3) — séquence email sous accord humain bloquant", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    await seedTask(pg);
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(lifecycle);
  });

  it("propose (approbation en attente, RIEN exécuté), puis exécute au grant", async () => {
    await bus.append(
      makeEvent({
        id: asId<EventId>("evt-assign"),
        type: "task.assigned",
        payload: { taskId: asId<TaskId>("task-l"), agentId: "lifecycle" as AgentId },
        correlationId: CORR,
        mandateId: M,
        emittedBy: "orchestrator",
      }),
    );
    await rt.drain();

    // Une approbation en attente, AUCUNE action exécutée, run suspendu.
    const appr = await q(pg, "M", "select id, status, tier from approvals where tool_call_name='prepare_email_sequence'");
    expect(appr).toHaveLength(1);
    expect(appr[0]?.status).toBe("pending");
    expect(appr[0]?.tier).toBe("T3");
    const tcBefore = await q(pg, "M", "select count(*)::int as n from tool_calls");
    expect(Number(tcBefore[0]?.n)).toBe(0);
    const runBefore = await q(pg, "M", "select status from agent_runs where agent_id='lifecycle'");
    expect(runBefore[0]?.status).toBe("awaiting_approval");

    // Le founder approuve → human.approval_granted → exécution.
    const approvalId = String(appr[0]?.id);
    await withMandate(pg, "M", async () => {
      await pg.query("update approvals set status='granted', decided_by=$1, decided_at=now() where id=$2", ["op-cecilia", approvalId]);
    });
    await bus.append(
      makeEvent({
        id: asId<EventId>("evt-grant"),
        type: "human.approval_granted",
        payload: { approvalId: asId<ApprovalId>(approvalId), by: OP },
        correlationId: CORR,
        mandateId: M,
        emittedBy: OP,
      }),
    );
    await rt.drain();

    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='email_sequence'");
    expect(Number(arts[0]?.n)).toBe(1);
    const tc = await q(pg, "M", "select tier, approval_id from tool_calls where name='prepare_email_sequence'");
    expect(tc).toHaveLength(1);
    expect(tc[0]?.tier).toBe("T3");
    expect(tc[0]?.approval_id).toBe(approvalId);
    const done = await q(pg, "M", "select human_minutes_spent from agent_runs where agent_id='lifecycle' and status='completed'");
    expect(done).toHaveLength(1);
    expect(Number(done[0]?.human_minutes_spent)).toBe(2);
  });
});
