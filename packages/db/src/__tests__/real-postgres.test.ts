/**
 * Réserve 1 — rejeu de l'isolation sur un VRAI Postgres, à travers un pooler en mode transaction,
 * avec DEUX connexions concurrentes réelles (transactions qui se chevauchent dans le temps).
 * Ne s'exécute que si `ANESIS_TEST_DATABASE_URL` pointe vers un Postgres de test (voir .github/workflows/ci.yml).
 * Localement (sans la variable), la suite est ignorée — PGlite ne peut pas la remplacer.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { deployDatabase } from "../deploy.js";
import { withMandate, type SqlClient } from "../context.js";

const OWNER_URL = process.env.ANESIS_TEST_DATABASE_URL; // rôle propriétaire (migrations)
const APP_URL = process.env.ANESIS_TEST_APP_DATABASE_URL ?? OWNER_URL; // via pooler transaction, rôle anesis_app

const run = OWNER_URL ? describe : describe.skip;

run("isolation sur vrai Postgres + pooler transaction (deux connexions concurrentes)", () => {
  let admin: pg.Client;
  let c1: pg.Client;
  let c2: pg.Client;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: OWNER_URL });
    await admin.connect();
    await deployDatabase((sql) => admin.query(sql).then(() => undefined));
    // seed en propriétaire (bypass RLS) : deux mandats complets
    for (const m of ["A", "B"]) {
      await admin.query("insert into properties (id,name,region,source) values ($1,$2,'South West','test') on conflict do nothing", [`prop-${m}`, `P ${m}`]);
      await admin.query("insert into mandates (id,mandate_id,property_id) values ($1,$1,$2) on conflict do nothing", [m, `prop-${m}`]);
      await admin.query("insert into theses (id,mandate_id,leak_index) values ($1,$2,50) on conflict do nothing", [`th-${m}`, m]);
      await admin.query("insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,$2,$3,'x',1,'x') on conflict do nothing", [`ll-${m}`, m, `th-${m}`]);
      await admin.query("insert into objectives (id,mandate_id,loss_line_id,title,target_recovery_pence) values ($1,$2,$3,'o',1) on conflict do nothing", [`obj-${m}`, m, `ll-${m}`]);
    }
    // 0002 crée anesis_app en NOLOGIN (le login est géré par la plateforme en prod : Supabase/Neon).
    // Pour rejouer fidèlement le pooler transaction, on lui donne un login le temps du test : les
    // connexions applicatives s'authentifient DIRECTEMENT comme anesis_app à travers le pooler,
    // exactement comme en prod. On évite `set role` — il ne survit pas au pooling transaction
    // (chaque transaction peut atterrir sur un backend différent où l'état de session est perdu).
    await admin.query("alter role anesis_app with login password 'app'");
    c1 = new pg.Client({ connectionString: APP_URL });
    c2 = new pg.Client({ connectionString: APP_URL });
    await c1.connect();
    await c2.connect();
  });

  afterAll(async () => {
    await Promise.allSettled([c1?.end(), c2?.end(), admin?.end()]);
  });

  it("deux transactions concurrentes ne voient chacune que leur mandat", async () => {
    // Ouvre les deux transactions AVANT de lire → chevauchement temporel réel.
    await c1.query("begin");
    await c2.query("begin");
    await c1.query("select set_config('app.mandate_id','A',true)");
    await c2.query("select set_config('app.mandate_id','B',true)");

    const r1 = await c1.query("select id from objectives");
    const r2 = await c2.query("select id from objectives");
    expect(r1.rows.map((r) => r.id)).toEqual(["obj-A"]);
    expect(r2.rows.map((r) => r.id)).toEqual(["obj-B"]);

    await c1.query("commit");
    await c2.query("commit");
  });

  it("hors transaction, à travers le pooler, aucune ligne (pas de fuite entre requêtes)", async () => {
    const leaked = await withMandate(c1 as unknown as SqlClient, "A", async () => (await c1.query("select id from objectives")).rows);
    expect(leaked.map((r) => r.id)).toEqual(["obj-A"]);
    const bare = await c1.query("select id from objectives"); // nouvelle transaction implicite, pas de contexte
    expect(bare.rows).toHaveLength(0);
  });
});
