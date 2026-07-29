import { beforeAll, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { withFounder, withMandate } from "../context.js";
import type { SqlClient } from "../context.js";

let pg: SqlClient;

async function seedMandate(m: string): Promise<void> {
  await withMandate(pg, m, async () => {
    await pg.query("insert into properties (id,name,region,source) values ($1,$2,'South West','test')", [`prop-${m}`, `Property ${m}`]);
    await pg.query("insert into mandates (id,mandate_id,property_id) values ($1,$1,$2)", [m, `prop-${m}`]);
    await pg.query("insert into theses (id,mandate_id,leak_index) values ($1,$2,50)", [`th-${m}`, m]);
    await pg.query(
      "insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,$2,$3,'response_time',1730000,'slow replies')",
      [`ll-${m}`, m, `th-${m}`],
    );
    await pg.query(
      "insert into objectives (id,mandate_id,loss_line_id,title,target_recovery_pence) values ($1,$2,$3,'Recover direct bookings',1730000)",
      [`obj-${m}`, m, `ll-${m}`],
    );
  });
}

beforeAll(async () => {
  pg = await makeTestDb({ asApp: true }); // RLS ne s'applique qu'à un rôle non-superuser
  await seedMandate("A");
  await seedMandate("B");
});

describe("RLS — lecture transversale fondatrice (cockpit)", () => {
  it("withFounder voit les objectifs de TOUS les mandats (A et B)", async () => {
    const rows = await withFounder(pg, async () => (await pg.query("select id from objectives order by id")).rows);
    expect(rows.map((r) => r.id)).toEqual(["obj-A", "obj-B"]);
  });

  it("withFounder lit aussi mandats et thèses en transversal", async () => {
    const { mandates, theses } = await withFounder(pg, async () => ({
      mandates: (await pg.query("select id from mandates")).rows.length,
      theses: (await pg.query("select id from theses")).rows.length,
    }));
    expect(mandates).toBe(2);
    expect(theses).toBe(2);
  });

  it("hors withFounder et hors withMandate → 0 ligne : la lecture transversale ne fuite pas", async () => {
    const rows = (await pg.query("select id from objectives")).rows;
    expect(rows).toHaveLength(0);
  });

  it("le founder LIT tout mais n'ÉCRIT jamais hors mandat : un insert sous withFounder est refusé", async () => {
    await expect(
      withFounder(pg, async () => {
        await pg.query(
          "insert into theses (id,mandate_id,leak_index) values ('th-x','A',10)",
        );
      }),
    ).rejects.toThrow();
    // et rien n'a été écrit
    const count = await withFounder(pg, async () => (await pg.query("select id from theses where id='th-x'")).rows.length);
    expect(count).toBe(0);
  });
});

describe("délégation d'approbation — table operator_agent_assignments", () => {
  it("stocke les agents supervisés par un operator et se relit", async () => {
    await pg.query("insert into operators (id,name,email,role) values ('op-lea','Léa','lea@anesis.test','operator')");
    await pg.query("insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','c@anesis.test','founder')");
    await pg.query(
      "insert into operator_agent_assignments (operator_id,agent_id,assigned_by) values ('op-lea','media-buyer','op-cecilia')",
    );
    const rows = (await pg.query("select agent_id from operator_agent_assignments where operator_id='op-lea'")).rows;
    expect(rows.map((r) => r.agent_id)).toEqual(["media-buyer"]);
  });

  it("la clé primaire composite empêche d'assigner deux fois le même agent au même operator", async () => {
    await expect(
      pg.query("insert into operator_agent_assignments (operator_id,agent_id) values ('op-lea','media-buyer')"),
    ).rejects.toThrow();
  });
});
