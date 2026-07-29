import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { asId } from "@anesis/core/unsafe";
import type { Operator, OperatorId } from "@anesis/core";
import { decideApproval } from "../approval-decision.js";
import { closeTestDbs, makeDb } from "./harness.js";

afterEach(closeTestDbs);

const founder: Operator = { id: asId<OperatorId>("op-cecilia"), name: "Cecilia", email: "c@anesis.co.uk", role: "founder" };
const lea: Operator = { id: asId<OperatorId>("op-lea"), name: "Léa", email: "lea@anesis.co.uk", role: "operator" };

async function seedPendingApproval(pg: SqlClient, agentId: string, tier: string): Promise<void> {
  await pg.query("insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','c@anesis.co.uk','founder') on conflict do nothing");
  await pg.query("insert into operators (id,name,email,role) values ('op-lea','Léa','lea@anesis.co.uk','operator') on conflict do nothing");
  await pg.query("insert into properties (id,name,region,source,state) values ('p1','Coastal House','South West','seed','mandate')");
  await withMandate(pg, "m1", async () => {
    await pg.query("insert into mandates (id,mandate_id,property_id) values ('m1','m1','p1')");
    await pg.query(
      `insert into agent_runs (id, agent_id, mandate_id, trigger, human_minutes_spent, human_minutes_source, correlation_id, status)
       values ('run1',$1,'m1','{}'::jsonb,10,'measured','corr','completed')`,
      [agentId],
    );
    await pg.query(
      `insert into approvals (id, mandate_id, run_id, tool_call_name, tier, reason, status, expires_at)
       values ('appr1','m1','run1','launch_campaign',$1,'budget', 'pending', now() + interval '48 hours')`,
      [tier],
    );
  });
}

describe("décision d'approbation (grant/deny) — délégation appliquée", () => {
  let pg: SqlClient;
  beforeEach(async () => {
    pg = await makeDb();
  });

  it("le founder approuve n'importe quel tier ; decided_by est enregistré", async () => {
    await seedPendingApproval(pg, "media-buyer", "T4");
    const res = await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: founder, decision: "grant" });
    expect(res).toEqual({ ok: true, status: "granted" });
    const row = await withMandate(pg, "m1", async () =>
      (await pg.query("select status, decided_by from approvals where id='appr1'")).rows[0],
    );
    expect(row).toMatchObject({ status: "granted", decided_by: "op-cecilia" });
  });

  it("un operator NON assigné à l'agent est refusé (forbidden)", async () => {
    await seedPendingApproval(pg, "media-buyer", "T4");
    const res = await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: lea, decision: "grant" });
    expect(res).toEqual({ ok: false, code: "forbidden" });
  });

  it("un operator assigné à l'agent peut approuver", async () => {
    await seedPendingApproval(pg, "media-buyer", "T4");
    await pg.query("insert into operator_agent_assignments (operator_id,agent_id) values ('op-lea','media-buyer')");
    const res = await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: lea, decision: "grant" });
    expect(res).toEqual({ ok: true, status: "granted" });
  });

  it("T5 art-director : refusé sauf si l'operator est assigné Directrice Artistique", async () => {
    await seedPendingApproval(pg, "art-director", "T5");
    expect((await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: lea, decision: "grant" })).ok).toBe(false);
    await pg.query("insert into operator_agent_assignments (operator_id,agent_id) values ('op-lea','art-director')");
    expect((await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: lea, decision: "grant" })).ok).toBe(true);
  });

  it("deny enregistre le refus", async () => {
    await seedPendingApproval(pg, "media-buyer", "T4");
    const res = await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: founder, decision: "deny" });
    expect(res).toEqual({ ok: true, status: "denied" });
  });

  it("refuse une approbation déjà décidée (not_pending) ou inexistante (not_found)", async () => {
    await seedPendingApproval(pg, "media-buyer", "T4");
    await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: founder, decision: "grant" });
    expect(await decideApproval(pg, { mandateId: "m1", approvalId: "appr1", operator: founder, decision: "grant" })).toEqual({ ok: false, code: "not_pending" });
    expect(await decideApproval(pg, { mandateId: "m1", approvalId: "nope", operator: founder, decision: "grant" })).toEqual({ ok: false, code: "not_found" });
  });
});
