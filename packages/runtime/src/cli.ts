#!/usr/bin/env node
/**
 * anesis-runtime <command>
 *   migrate                 create the tables
 *   schedule [--now]        schedule the next cycle for the property (default: now)
 *   work                    run the worker loop (ANESIS_OFFLINE=1 for no live connectors)
 *   once                    process due jobs once and exit
 *   status                  jobs, models, last traces
 *   import <file> [--rooms N] [--date-order DMY|MDY] [--fx EUR=0.85]   read a PMS export, store the result, feed the next cycle
 * Backend: DATABASE_URL (Postgres) or ANESIS_PGLITE_DIR (embedded); neither = in-memory, which is only useful for `once`.
 */
import { openDatabase } from "./sql.js";
import { migrate } from "./schema.js";
import { runOnce, scheduleCycle, startWorker } from "./worker.js";
import { listJobs } from "./queue.js";
import { importFile } from "./imports.js";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";

const cmd = process.argv[2] ?? "status";
const db = await openDatabase();
await migrate(db);
const deps = { offline: process.env.ANESIS_OFFLINE === "1", cadenceDays: Number(process.env.ANESIS_CADENCE_DAYS ?? 7) };
if (cmd === "migrate") console.log(`schema ready on ${db.backend}`);
else if (cmd === "schedule") { const r = await scheduleCycle(db, COUNTRY_HOUSE_34.id, new Date().toISOString(), deps.cadenceDays); console.log(r.created ? `scheduled ${r.key}` : `already scheduled: ${r.key}`); }
else if (cmd === "once") { const r = await runOnce(db, deps); console.log(JSON.stringify(r)); }
else if (cmd === "work") { console.log(`worker on ${db.backend}; offline=${deps.offline}`); await startWorker(db, deps); }
else if (cmd === "import") {
  const file = process.argv[3]; if (!file) { console.error("usage: anesis-runtime import <file> [--rooms N] [--date-order DMY|MDY] [--fx EUR=0.85]"); process.exit(2); }
  const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const fx: Record<string, number> = {}; for (const kv of (arg("--fx") ?? "").split(",").filter(Boolean)) { const [c, v] = kv.split("="); if (c && v) fx[c.toUpperCase()] = Number(v); }
  const r = await importFile(db, file, { propertyId: COUNTRY_HOUSE_34.id, rooms: arg("--rooms") ? Number(arg("--rooms")) : null, dateOrder: arg("--date-order") as never, fxToGbp: fx });
  console.log(JSON.stringify({ file: r.provenance.filename, sha256: r.provenance.sha256.slice(0, 12), rows: r.counts, period: r.period, fields: r.fields, metrics: r.metrics, verdict: r.sufficiency.verdict, cannot: r.sufficiency.cannotCompute, next: r.sufficiency.nextData, issues: r.issues.map((i) => `${i.kind}×${i.count}: ${i.examples[0]}`) }, null, 2));
}
else if (cmd === "status") {
  console.log("jobs:", (await listJobs(db, 10)).map((j) => `${j.id} ${j.kind} ${j.state} ${j.key} attempts ${j.attempts}${j.lastError ? " error: " + j.lastError : ""}`).join("\n  ") || "none");
  console.log("models:", (await db.query<{ property_id: string; cycles: number; updated_at: string }>("select property_id, cycles, updated_at from property_models")).rows.map((r) => `${r.property_id} ${r.cycles} cycles, updated ${r.updated_at}`).join("; ") || "none");
  console.log("last traces:", (await db.query<{ type: string; state: string; at: string }>("select type, state, at from runtime_traces order by id desc limit 8")).rows.map((r) => `${r.at} ${r.type} ${r.state ?? ""}`).join("\n  ") || "none");
}
await db.close();
