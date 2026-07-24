import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { ApprovalId, CorrelationId, EventId, MandateId, OperatorId } from "@anesis/core";
import { AgentRuntime, rateDistribution } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-rate");
const OP = asId<OperatorId>("op-cecilia");

function parityBroken(id: string): Parameters<EventBus["append"]>[0] {
  return makeEvent({
    id: asId<EventId>(id),
    type: "external.rate_parity_broken",
    payload: { mandateId: M, channel: "booking.com", delta: { currency: "GBP", pence: 5000 } },
    correlationId: CORR,
    mandateId: M,
    emittedBy: "rate-distribution",
  });
}

describe("Rate & Distribution (T4) — parité/distribution sous accord humain", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(rateDistribution);
  });

  it("sur parité rompue : propose (T4, rien exécuté) puis exécute au grant", async () => {
    await bus.append(parityBroken("evt-1"));
    await rt.drain();

    const appr = await q(pg, "M", "select id, status, tier from approvals where tool_call_name='adjust_distribution'");
    expect(appr).toHaveLength(1);
    expect(appr[0]?.tier).toBe("T4");
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

    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='distribution_change'");
    expect(Number(arts[0]?.n)).toBe(1);
    const tc = await q(pg, "M", "select tier from tool_calls where name='adjust_distribution'");
    expect(tc[0]?.tier).toBe("T4");
    const done = await q(pg, "M", "select human_minutes_spent from agent_runs where agent_id='rate-distribution' and status='completed'");
    expect(Number(done[0]?.human_minutes_spent)).toBe(3);
  });

  it("idempotent : deux parités rompues ne créent qu'une seule approbation en attente", async () => {
    await bus.append(parityBroken("evt-1"));
    await rt.drain();
    await bus.append(parityBroken("evt-2"));
    await rt.drain();
    const appr = await q(pg, "M", "select count(*)::int as n from approvals where tool_call_name='adjust_distribution' and status='pending'");
    expect(Number(appr[0]?.n)).toBe(1);
  });
});
