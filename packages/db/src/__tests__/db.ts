/** Harness de test : un Postgres WASM (PGlite) en mémoire, migrations appliquées. */
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations } from "../migrate.js";
import type { SqlClient } from "../context.js";

/**
 * `asApp: true` bascule la connexion sur le rôle applicatif NON-superuser (`anesis_app`) via SET ROLE.
 * Indispensable pour tester la RLS : un superuser (le rôle par défaut de PGlite) la contourne TOUJOURS.
 * C'est la configuration de production (l'app ne se connecte jamais en propriétaire).
 */
export async function makeTestDb(opts: { asApp?: boolean } = {}): Promise<SqlClient> {
  const pg = new PGlite();
  await applyMigrations((sql) => pg.exec(sql));
  if (opts.asApp) {
    await pg.exec(`
      create role anesis_app nologin;
      grant usage on schema public to anesis_app;
      grant select, insert, update, delete on all tables in schema public to anesis_app;
      revoke update, delete on events from anesis_app;
      set role anesis_app;
    `);
  }
  return pg as unknown as SqlClient;
}
