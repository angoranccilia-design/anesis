import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { importPmsExport, type ImportOptions, type ImportResult } from "@anesis/ingest";
import type { SqlClient } from "./sql.js";
import { trace } from "./trace.js";

/** Runs the generic reader on a file, stores the full result with its provenance, and traces it. Reproducible: the stored result carries the hash and every declared option. */
export async function importFile(db: SqlClient, path: string, opts: Omit<ImportOptions, "filename" | "content"> & { propertyId: string }): Promise<ImportResult> {
  const bytes = new Uint8Array(readFileSync(path));
  const result = importPmsExport({ filename: basename(path), content: bytes, ...opts });
  await db.query(`insert into pms_imports (property_id, filename, sha256, imported_at, period_from, period_to, verdict, result) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [opts.propertyId, result.provenance.filename, result.provenance.sha256, result.provenance.importedAt, result.period.from, result.period.to, result.sufficiency.verdict, JSON.stringify(result)]);
  await trace(db, { propertyId: opts.propertyId, kind: "connector", type: "CONN-PMS", state: result.snapshot ? "CONNECTED" : "PARTIAL", detail: `file import ${result.provenance.filename} sha256 ${result.provenance.sha256.slice(0, 12)}: ${result.sufficiency.verdict}; ${result.counts.kept} kept of ${result.counts.rows} rows; issues: ${result.issues.map((i) => `${i.kind}×${i.count}`).join(", ") || "none"}`, at: result.provenance.importedAt });
  return result;
}

export async function latestImport(db: SqlClient, propertyId: string): Promise<ImportResult | null> {
  const r = await db.query<{ result: unknown }>(`select result from pms_imports where property_id = $1 order by imported_at desc, id desc limit 1`, [propertyId]);
  const row = r.rows[0]; if (!row) return null;
  return (typeof row.result === "string" ? JSON.parse(row.result) : row.result) as ImportResult;
}
