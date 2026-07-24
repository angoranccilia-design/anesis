/** Application des migrations SQL (structure + sécurité, et rôles en prod). */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type SqlExec = (sql: string) => Promise<unknown>;

const BASE_MIGRATIONS = [
  "0000_init.sql",
  "0001_security.sql",
  "0003_event_processing.sql",
  "0005_assessments.sql",
  "0006_publications.sql",
] as const;

/**
 * Applique les migrations dans l'ordre. `roles: true` ajoute 0002_roles.sql (Postgres réel :
 * crée le rôle applicatif et révoque UPDATE/DELETE sur events). À laisser à false sous PGlite.
 */
export async function applyMigrations(exec: SqlExec, opts: { roles?: boolean } = {}): Promise<void> {
  const files: string[] = [...BASE_MIGRATIONS];
  if (opts.roles) files.push("0002_roles.sql");
  for (const file of files) {
    const url = new URL(`../migrations/${file}`, import.meta.url);
    const sql = readFileSync(fileURLToPath(url), "utf8");
    await exec(sql);
  }
}
