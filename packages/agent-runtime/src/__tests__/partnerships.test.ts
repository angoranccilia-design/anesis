import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, MandateId } from "@anesis/core";
import { AgentRuntime, partnerships, retentionSweeper } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-partner");

async function seedPartner(pg: SqlClient, id: string, name: string): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query("insert into partners (id, mandate_id, name, kind, status) values ($1,'M',$2,'pms','pending')", [id, name]);
  });
}

async function matureRetentions(pg: SqlClient): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query("update retentions set due_at = now() - interval '1 minute'");
  });
}

describe("Partnerships (T2) — prise de contact en retenue durable", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(partnerships);
    rt.register(retentionSweeper);
  });

  it("programme la prise de contact (2h) puis le balayeur l'envoie", async () => {
    await seedPartner(pg, "p-1", "Cotswold PMS Ltd");
    await rt.fireTick("weekly.tick", M, CORR);

    const ret = await q(pg, "M", "select status from retentions where action_name='contact_partner'");
    expect(ret).toHaveLength(1);
    expect(ret[0]?.status).toBe("pending");
    expect((await q(pg, "M", "select status from partners where id='p-1'"))[0]?.status).toBe("contacting");
    expect(Number((await q(pg, "M", "select count(*)::int as n from tool_calls"))[0]?.n)).toBe(0);

    await matureRetentions(pg);
    await rt.fireTick("hourly.tick", M, CORR);

    expect((await q(pg, "M", "select tier from tool_calls where name='contact_partner'"))[0]?.tier).toBe("T2");
    expect((await q(pg, "M", "select status from partners where id='p-1'"))[0]?.status).toBe("contacted");
    expect((await q(pg, "M", "select status from retentions where action_name='contact_partner'"))[0]?.status).toBe("executed");
  });

  it("idempotent : deux weekly.tick ne reprennent pas un partenaire déjà en cours", async () => {
    await seedPartner(pg, "p-1", "Cotswold PMS Ltd");
    await rt.fireTick("weekly.tick", M, CORR);
    await rt.fireTick("weekly.tick", M, CORR);
    const ret = await q(pg, "M", "select count(*)::int as n from retentions where action_name='contact_partner'");
    expect(Number(ret[0]?.n)).toBe(1);
  });
});
