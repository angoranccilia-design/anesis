import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SqlClient } from "./sql.js";

/** The business tables, as JSON files, so a backup can be read without the application and restored into an empty database. Jobs, traces and snapshots are operational and not backed up. */
export const BACKUP_TABLES = ["properties", "property_models", "operator_registers", "operator_properties", "pms_imports", "interventions", "cycle_results"] as const;
export async function backup(db: SqlClient, dir: string): Promise<{ table: string; rows: number }[]> {
  mkdirSync(dir, { recursive: true });
  const out: { table: string; rows: number }[] = [];
  for (const t of BACKUP_TABLES) { const rows = (await db.query<Record<string, unknown>>(`select * from ${t}`)).rows; writeFileSync(join(dir, `${t}.json`), JSON.stringify(rows, null, 1)); out.push({ table: t, rows: rows.length }); }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ at: new Date().toISOString(), tables: out }, null, 1));
  return out;
}
/** Restores rows with insert … on conflict do nothing: an existing row is never overwritten by a restore. */
export async function restore(db: SqlClient, dir: string): Promise<{ table: string; inserted: number }[]> {
  const out: { table: string; inserted: number }[] = [];
  for (const t of BACKUP_TABLES) {
    const f = join(dir, `${t}.json`); if (!existsSync(f)) continue;
    const rows = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>[]; let n = 0;
    for (const r of rows) {
      const cols = Object.keys(r); const vals = cols.map((c) => { const v = r[c]; return v !== null && typeof v === "object" ? JSON.stringify(v) : v; });
      const res = await db.query(`insert into ${t} (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) on conflict do nothing returning 1`, vals); n += res.rows.length;
    }
    out.push({ table: t, inserted: n });
  }
  return out;
}
