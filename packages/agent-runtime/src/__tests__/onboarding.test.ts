import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, OperatorId } from "@anesis/core";
import { AgentRuntime, planner, signMandate } from "../index.js";
import { closeTestDbs, makeDb } from "./harness.js";

afterEach(closeTestDbs);

const CORR = asId<CorrelationId>("corr-onboarding");
const OP = asId<OperatorId>("op-cecilia");

/** Une Property QUALIFIÉE avec son évaluation figée (comme après le lot underwriter de l'étape 2). */
async function seedQualifiedProperty(pg: SqlClient): Promise<void> {
  await pg.query(
    "insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','cecilia@anesis.co.uk','founder') on conflict (id) do nothing",
  );
  await pg.query(
    "insert into properties (id,name,region,source,state) values ('prop-1','Coastal House','South West','campaign-2026-08','qualified')",
  );
  await pg.query(
    `insert into assessments (id, property_id, leak_index, monthly_loss_pence, decision, decision_code, icp, sub_scores)
     values ('a-1','prop-1',68,1000000,'qualified','QUALIFIED','{}'::jsonb,$1::jsonb)`,
    [JSON.stringify({ speed: 40, reviews: 60, ota: 100, retargeting: 100 })],
  );
}

describe("Onboarding (maillon étape 2 ↔ 3) — signMandate ferme la boucle jusqu'aux tâches", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedQualifiedProperty(pg);
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(planner);
  });

  it("signe une Property qualifiée → mandat + thèse attachée → planner → objectifs + tâches", async () => {
    const res = await signMandate(pg, bus, { propertyId: "prop-1", operatorId: OP, correlationId: CORR });
    expect(res.lossLineCount).toBe(4); // speed/reviews/ota/retargeting, tous au-dessus du seuil

    // Mandat créé, thèse attachée, Property passée à l'état `mandate`.
    // (mandates est sous RLS → lecture dans le contexte du mandat.)
    const m = await withMandate(pg, res.mandateId, async () =>
      (await pg.query("select id, state, thesis_id from mandates where id = $1", [res.mandateId])).rows[0],
    );
    expect(m?.state).toBe("active");
    expect(m?.thesis_id).toBe(res.thesisId);
    const propState = (await pg.query("select state from properties where id = 'prop-1'")).rows[0]?.state;
    expect(propState).toBe("mandate");

    // Événements du maillon émis.
    const evts = (
      await pg.query("select type from events where type like 'mandate.%' order by type")
    ).rows.map((r) => r.type);
    expect(evts).toEqual(["mandate.created", "mandate.thesis_attached"]);

    // La thèse et ses postes de perte sont persistés (dans le contexte du mandat).
    const lossLines = await withMandate(pg, res.mandateId, async () =>
      (await pg.query("select count(*)::int as n from loss_lines where thesis_id = $1", [res.thesisId])).rows,
    );
    expect(Number(lossLines[0]?.n)).toBe(4);

    // ── La boucle se ferme : le drain déclenche le planner qui dérive objectifs + tâches ──
    await rt.drain();

    const plan = await withMandate(pg, res.mandateId, async () => ({
      objectives: (await pg.query("select count(*)::int as n from objectives where mandate_id = $1", [res.mandateId])).rows[0],
      tasks: (await pg.query("select assigned_agent from tasks where mandate_id = $1 order by assigned_agent", [res.mandateId])).rows,
    }));
    expect(Number(plan.objectives?.n)).toBe(4);
    expect(plan.tasks.map((t) => t.assigned_agent)).toEqual(["conversion", "media-buyer", "rate-distribution", "reputation"]);
  });

  it("refuse de signer une Property non qualifiée", async () => {
    await pg.query("update properties set state = 'assessed' where id = 'prop-1'");
    await expect(signMandate(pg, bus, { propertyId: "prop-1", operatorId: OP, correlationId: CORR })).rejects.toThrow(
      /qualified/,
    );
  });
});
