import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { AgentId, ApprovalId, CorrelationId, EventId, MandateId, OperatorId, TaskId } from "@anesis/core";
import { AgentRuntime, contentCreator } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-content");
const OP = asId<OperatorId>("op-cecilia");

describe("Content Creator (T5) — production de contenu sous accord humain bloquant", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    await withMandate(pg, "M", async () => {
      await pg.query(
        "insert into tasks (id, mandate_id, objective_id, assigned_agent, state, intent) values ('task-cc','M','obj-M','content-creator','assigned','Produce content')",
      );
    });
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(contentCreator);
  });

  it("propose (T5, rien exécuté) puis produit le contenu au grant", async () => {
    await bus.append(
      makeEvent({
        id: asId<EventId>("evt-assign"),
        type: "task.assigned",
        payload: { taskId: asId<TaskId>("task-cc"), agentId: "content-creator" as AgentId },
        correlationId: CORR,
        mandateId: M,
        emittedBy: "orchestrator",
      }),
    );
    await rt.drain();

    const appr = await q(pg, "M", "select id, tier, status from approvals where tool_call_name='produce_content'");
    expect(appr).toHaveLength(1);
    expect(appr[0]?.tier).toBe("T5");
    expect(Number((await q(pg, "M", "select count(*)::int as n from tool_calls"))[0]?.n)).toBe(0);

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

    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='content'");
    expect(Number(arts[0]?.n)).toBe(1);
    const tc = await q(pg, "M", "select tier from tool_calls where name='produce_content'");
    expect(tc[0]?.tier).toBe("T5");
    const done = await q(pg, "M", "select human_minutes_spent from agent_runs where agent_id='content-creator' and status='completed'");
    expect(Number(done[0]?.human_minutes_spent)).toBe(5);
  });
});
