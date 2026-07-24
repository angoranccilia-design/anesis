import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, MandateId } from "@anesis/core";
import { AgentRuntime, reputation, retentionSweeper } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-rep");

async function seedReview(pg: SqlClient, id: string, source: string): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query(
      "insert into reviews (id, mandate_id, source, rating, text) values ($1,'M',$2,4.2,'Lovely stay but slow check-in')",
      [id, source],
    );
  });
}

function reviewReceived(id: string, source: string): Parameters<EventBus["append"]>[0] {
  return makeEvent({
    id: asId<EventId>(id),
    type: "external.review_received",
    payload: { mandateId: M, source, rating: 4.2 },
    correlationId: CORR,
    mandateId: M,
    emittedBy: "reputation",
  });
}

async function matureRetentions(pg: SqlClient): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query("update retentions set due_at = now() - interval '1 minute'");
  });
}

describe("Reputation (T2) — réponse Google en retenue durable, TripAdvisor en brouillon", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(reputation);
    rt.register(retentionSweeper);
  });

  it("avis Google : PROGRAMME la réponse (2h, rien exécuté), puis le balayeur la publie", async () => {
    await seedReview(pg, "rev-g", "google");
    await bus.append(reviewReceived("evt-g", "google"));
    await rt.drain();

    // Programmée, pas exécutée ; avis marqué (idempotence) ; run en retenue.
    const ret = await q(pg, "M", "select status from retentions where action_name='reply_review'");
    expect(ret).toHaveLength(1);
    expect(ret[0]?.status).toBe("pending");
    expect(Number((await q(pg, "M", "select count(*)::int as n from tool_calls"))[0]?.n)).toBe(0);
    const resp = await q(pg, "M", "select responded_at from reviews where id='rev-g'");
    expect(resp[0]?.responded_at).not.toBeNull();
    const run = await q(pg, "M", "select status from agent_runs where agent_id='reputation'");
    expect(run[0]?.status).toBe("sleeping_retention");

    // Fenêtre écoulée → le balayeur publie.
    await matureRetentions(pg);
    await rt.fireTick("hourly.tick", M, CORR);

    const tc = await q(pg, "M", "select tier from tool_calls where name='reply_review'");
    expect(tc[0]?.tier).toBe("T2");
    expect((await q(pg, "M", "select status from retentions where action_name='reply_review'"))[0]?.status).toBe("executed");
    expect((await q(pg, "M", "select status from agent_runs where agent_id='reputation'"))[0]?.status).toBe("completed");
  });

  it("avis TripAdvisor : produit un brouillon interne + notification (pas d'auto-publication)", async () => {
    await seedReview(pg, "rev-t", "tripadvisor");
    await bus.append(reviewReceived("evt-t", "tripadvisor"));
    await rt.drain();

    const arts = await q(pg, "M", "select count(*)::int as n from artifacts where type='review_response_draft'");
    expect(Number(arts[0]?.n)).toBe(1);
    // aucune retenue programmée (pas d'auto-publication)
    expect(Number((await q(pg, "M", "select count(*)::int as n from retentions"))[0]?.n)).toBe(0);
    const run = await q(pg, "M", "select status from agent_runs where agent_id='reputation'");
    expect(run[0]?.status).toBe("completed");
  });
});
