#!/usr/bin/env node
/**
 * anesis-runtime <command>
 *   migrate                 create the tables
 *   schedule [--now]        schedule the next cycle for the property (default: now)
 *   work                    run the worker loop (ANESIS_OFFLINE=1 for no live connectors)
 *   once                    process due jobs once and exit
 *   status                  jobs, models, last traces
 * Backend: DATABASE_URL (Postgres) or ANESIS_PGLITE_DIR (embedded); neither = in-memory, which is only useful for `once`.
 */
import { openDatabase } from "./sql.js";
import { migrate } from "./schema.js";
import { runOnce, scheduleCycle, startWorker } from "./worker.js";
import { listJobs } from "./queue.js";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";

const cmd = process.argv[2] ?? "status";
const db = await openDatabase();
await migrate(db);
const deps = { offline: process.env.ANESIS_OFFLINE === "1", cadenceDays: Number(process.env.ANESIS_CADENCE_DAYS ?? 7) };
if (cmd === "migrate") console.log(`schema ready on ${db.backend}`);
else if (cmd === "schedule") { const r = await scheduleCycle(db, COUNTRY_HOUSE_34.id, new Date().toISOString(), deps.cadenceDays); console.log(r.created ? `scheduled ${r.key}` : `already scheduled: ${r.key}`); }
else if (cmd === "once") { const r = await runOnce(db, deps); console.log(JSON.stringify(r)); }
else if (cmd === "work") { console.log(`worker on ${db.backend}; offline=${deps.offline}`); await startWorker(db, deps); }
else if (cmd === "status") {
  console.log("jobs:", (await listJobs(db, 10)).map((j) => `${j.id} ${j.kind} ${j.state} ${j.key} attempts ${j.attempts}${j.lastError ? " error: " + j.lastError : ""}`).join("\n  ") || "none");
  console.log("models:", (await db.query<{ property_id: string; cycles: number; updated_at: string }>("select property_id, cycles, updated_at from property_models")).rows.map((r) => `${r.property_id} ${r.cycles} cycles, updated ${r.updated_at}`).join("; ") || "none");
  console.log("last traces:", (await db.query<{ type: string; state: string; at: string }>("select type, state, at from runtime_traces order by id desc limit 8")).rows.map((r) => `${r.at} ${r.type} ${r.state ?? ""}`).join("\n  ") || "none");
}
await db.close();
