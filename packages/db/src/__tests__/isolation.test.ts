import { beforeAll, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { withMandate } from "../context.js";
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

describe("RLS — isolation par mandat", () => {
  it("le contexte A ne voit que les objectifs de A", async () => {
    const rows = await withMandate(pg, "A", async () => (await pg.query("select id from objectives")).rows);
    expect(rows.map((r) => r.id)).toEqual(["obj-A"]);
  });

  it("le contexte B ne voit que les objectifs de B", async () => {
    const rows = await withMandate(pg, "B", async () => (await pg.query("select id from objectives")).rows);
    expect(rows.map((r) => r.id)).toEqual(["obj-B"]);
  });

  it("hors transaction (connexion réutilisée, aucun contexte) → 0 ligne : le contexte NE FUITE PAS", async () => {
    const rows = (await pg.query("select id from objectives")).rows;
    // Échouerait si withMandate posait un GUC de session (set_config(..., false)) : fuite de pool.
    expect(rows).toHaveLength(0);
  });
});

describe("Contrôle négatif — un GUC de session fuiterait (la classe de bug qu'on prévient)", () => {
  it("set_config(..., false) rend les lignes visibles hors transaction", async () => {
    await pg.query("select set_config('app.mandate_id', $1, false)", ["A"]); // session-scoped = MAUVAIS
    const leaked = (await pg.query("select id from objectives")).rows;
    expect(leaked.length).toBeGreaterThan(0);
    await pg.query("select set_config('app.mandate_id', '', false)"); // reset pour ne pas polluer
  });
});
