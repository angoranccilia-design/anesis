import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { ApprovalId, CorrelationId, EventId, MandateId, OperatorId, ThesisId } from "@anesis/core";
import { AgentRuntime, artDirector } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-art");
const OP = asId<OperatorId>("op-cecilia");

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

describe("Art Director (T5, interne) — direction créative validée, jamais publiée", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(artDirector);
  });

  it("à la signature : propose la direction (T5) puis produit un artefact INTERNE au grant", async () => {
    await bus.append(thesisAttached("evt-1"));
    await rt.drain();

    const appr = await q(pg, "M", "select id, tier from approvals where tool_call_name='propose_creative_direction'");
    expect(appr).toHaveLength(1);
    expect(appr[0]?.tier).toBe("T5");

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

    const arts = await q(pg, "M", "select state from artifacts where type='creative_direction'");
    expect(arts).toHaveLength(1);
    expect(arts[0]?.state).toBe("produced"); // interne : jamais 'published'
    const tc = await q(pg, "M", "select tier from tool_calls where name='propose_creative_direction'");
    expect(tc[0]?.tier).toBe("T5");
  });

  it("idempotent : une seule direction créative par mandat", async () => {
    await bus.append(thesisAttached("evt-1"));
    await rt.drain();
    await bus.append(thesisAttached("evt-2"));
    await rt.drain();
    const appr = await q(pg, "M", "select count(*)::int as n from approvals where tool_call_name='propose_creative_direction'");
    expect(Number(appr[0]?.n)).toBe(1);
  });
});
