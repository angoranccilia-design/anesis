import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, withMandate, type SqlClient } from "@anesis/db";

/**
 * PGlite (WASM) ne libère pas son « code space » à la fermeture : créer une instance par test finit
 * par OOM. On réutilise donc UNE instance et on repart d'un schéma vierge à chaque test (drop/recreate
 * + migrations + rôle applicatif). Isolation garantie sans multiplier les instances WASM.
 */
let shared: PGlite | null = null;

export async function makeDb(): Promise<SqlClient> {
  if (!shared) shared = new PGlite();
  const pg = shared;
  await pg.exec("reset role;"); // repasser superuser (un test précédent a pu SET ROLE anesis_app)
  await pg.exec("drop schema if exists public cascade; create schema public;");
  await applyMigrations((sql) => pg.exec(sql));
  await pg.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anesis_app') then create role anesis_app nologin; end if;
    end $$;
    grant usage on schema public to anesis_app;
    grant select, insert, update, delete on all tables in schema public to anesis_app;
    revoke update, delete on events from anesis_app;
    set role anesis_app;
  `);
  return pg as unknown as SqlClient;
}

/** L'instance partagée est réutilisée entre tests (réinitialisée dans makeDb) ; rien à fermer par test. */
export async function closeTestDbs(): Promise<void> {}

/** Amorce un mandat complet avec un objectif à l'état `created`. */
export async function seedMandateWithObjective(pg: SqlClient, m: string): Promise<void> {
  await pg.query(
    "insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','cecilia@anesis.co.uk','founder') on conflict (id) do nothing",
  );
  await withMandate(pg, m, async () => {
    await pg.query("insert into properties (id,name,region,source) values ($1,$2,'South West','test')", [`prop-${m}`, `P ${m}`]);
    await pg.query("insert into mandates (id,mandate_id,property_id) values ($1,$1,$2)", [m, `prop-${m}`]);
    await pg.query("insert into theses (id,mandate_id,leak_index) values ($1,$2,72)", [`th-${m}`, m]);
    await pg.query(
      "insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,$2,$3,'direct_bookings',1730000,'OTA dependence')",
      [`ll-${m}`, m, `th-${m}`],
    );
    await pg.query(
      "insert into objectives (id,mandate_id,loss_line_id,title,target_recovery_pence,state) values ($1,$2,$3,'Recover direct bookings',1730000,'created')",
      [`obj-${m}`, m, `ll-${m}`],
    );
  });
}

/** Lecture bornée à un mandat (contexte RLS). */
export async function q(pg: SqlClient, m: string, sql: string): Promise<Array<Record<string, unknown>>> {
  return withMandate(pg, m, async () => (await pg.query(sql)).rows);
}
