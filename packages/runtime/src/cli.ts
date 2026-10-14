#!/usr/bin/env node
/**
 * anesis-runtime <command>
 *   migrate                                   create the tables
 *   property <id> --file spec.json | --demo    declare a property (identity, type, location, rooms); --demo registers the simulated one
 *   properties                                list declared properties
 *   register <property> --file registers.json merge operator registers (events, competitors, systems, partnership, benchmarks with sources)
 *   grant <operator-id> <property>            let an operator read and act on a property (founders need no grant)
 *   schedule [--now] --property <id>          schedule the next cycle for the property
 *   work                                      run the worker loop (ANESIS_OFFLINE=1 for no live connectors)
 *   once                                      process due jobs once and exit
 *   status                                    jobs, properties, models, last traces
 *   connectors [--property <id>]              call every live connector now and print the real statuses
 *   health                                    the health record as JSON (exit 1 when not ok); `work` also serves GET /health on ANESIS_HEALTH_PORT
 *   backup <dir> | restore <dir>              business tables as JSON files (restore never overwrites an existing row)
 *   status [--json]
 *   import <file> --property <id> [--rooms N] [--date-order DMY|MDY] [--fx EUR=0.85] [--collected-at ISO]
 * Backend: DATABASE_URL (Postgres) or ANESIS_PGLITE_DIR (embedded); neither = in-memory, which is only useful for `once`.
 */
import { readFileSync } from "node:fs";
import { openDatabase } from "./sql.js";
import { migrate } from "./schema.js";
import { runOnce, scheduleCycle, startWorker } from "./worker.js";
import { listJobs } from "./queue.js";
import { importFile } from "./imports.js";
import { upsertProperty, listProperties, grantProperty } from "./properties.js";
import { saveRegisters } from "./registers.js";
import { COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";
import { verifyConnectors } from "@anesis/connectors";
import { health, startHealthServer } from "./health.js";
import { backup, restore } from "./backup.js";
import { log } from "./log.js";
import { loadProperty } from "./properties.js";

const cmd = process.argv[2] ?? "status";
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(k);
const db = await openDatabase();
await migrate(db);
const deps = { offline: process.env.ANESIS_OFFLINE === "1", cadenceDays: Number(process.env.ANESIS_CADENCE_DAYS ?? 7) };
const propertyArg = (): string => { const p = arg("--property") ?? process.env.ANESIS_PROPERTY_ID; if (!p) { console.error("--property <id> (or ANESIS_PROPERTY_ID) is required"); process.exit(2); } return p; };
try {
  if (cmd === "migrate") console.log(`schema ready on ${db.backend}`);
  else if (cmd === "property") {
    const id = process.argv[3]; if (!id) { console.error("usage: anesis-runtime property <id> --file spec.json | --demo"); process.exit(2); }
    const spec: PropertySpec = has("--demo") ? COUNTRY_HOUSE_34 : { ...(JSON.parse(readFileSync(arg("--file") ?? "", "utf8")) as PropertySpec), id };
    await upsertProperty(db, spec); console.log(`property ${spec.id} declared: ${spec.name}${has("--demo") ? " (SIMULATED)" : ""}`);
  }
  else if (cmd === "properties") console.log((await listProperties(db)).map((p) => `${p.id} ${p.name}${p.simulated ? " (SIMULATED)" : ""}`).join("\n") || "none declared");
  else if (cmd === "register") {
    const id = process.argv[3]; const file = arg("--file"); if (!id || !file) { console.error("usage: anesis-runtime register <property> --file registers.json"); process.exit(2); }
    const r = await saveRegisters(db, id, JSON.parse(readFileSync(file, "utf8")));
    console.log(`registers for ${id}: ${r.events.length} event(s), ${r.competitors.length} competitor observation(s), systems ${Object.keys(r.systems).join(",") || "none"}, benchmarks ${Object.keys(r.benchmarks).length}, partnership ${r.partnership ? "on record" : "none"}`);
  }
  else if (cmd === "grant") { const op = process.argv[3], id = process.argv[4]; if (!op || !id) { console.error("usage: anesis-runtime grant <operator-id> <property>"); process.exit(2); } await grantProperty(db, op, id); console.log(`${op} may access ${id}`); }
  else if (cmd === "schedule") { const id = propertyArg(); const r = await scheduleCycle(db, id, new Date().toISOString(), deps.cadenceDays); console.log(r.created ? `scheduled ${r.key}` : `already scheduled: ${r.key}`); }
  else if (cmd === "once") { const r = await runOnce(db, deps); console.log(JSON.stringify(r)); }
  else if (cmd === "work") { const port = Number(process.env.ANESIS_HEALTH_PORT ?? 0); const srv = port ? startHealthServer(db, port) : null; log("info", "worker started", { backend: db.backend, offline: deps.offline, cadenceDays: deps.cadenceDays, healthPort: port || null }); await startWorker(db, deps); srv?.close(); }
  else if (cmd === "health") { const h = await health(db); console.log(JSON.stringify(h, null, 2)); if (!h.ok) process.exitCode = 1; }
  else if (cmd === "backup") { const dir = process.argv[3]; if (!dir) { console.error("usage: anesis-runtime backup <dir>"); process.exit(2); } console.log(JSON.stringify(await backup(db, dir))); }
  else if (cmd === "restore") { const dir = process.argv[3]; if (!dir) { console.error("usage: anesis-runtime restore <dir>"); process.exit(2); } console.log(JSON.stringify(await restore(db, dir))); }
  else if (cmd === "import") {
    const file = process.argv[3]; if (!file) { console.error("usage: anesis-runtime import <file> --property <id> [--rooms N] [--date-order DMY|MDY] [--fx EUR=0.85] [--collected-at ISO]"); process.exit(2); }
    const id = propertyArg();
    const fx: Record<string, number> = {}; for (const kv of (arg("--fx") ?? "").split(",").filter(Boolean)) { const [c, v] = kv.split("="); if (c && v) fx[c.toUpperCase()] = Number(v); }
    const r = await importFile(db, file, { propertyId: id, rooms: arg("--rooms") ? Number(arg("--rooms")) : null, dateOrder: arg("--date-order") as never, fxToGbp: fx, collectedAt: arg("--collected-at") ?? null });
    console.log(JSON.stringify({ property: id, file: r.provenance.filename, sha256: r.provenance.sha256.slice(0, 12), rows: r.counts, period: r.period, window: r.sufficiency.window, recency: r.recency.statement, fields: r.fields, metrics: r.metrics, verdict: r.sufficiency.verdict, cannot: r.sufficiency.cannotCompute, next: r.sufficiency.nextData }, null, 2));
  }
  else if (cmd === "connectors") {
    const id = arg("--property") ?? process.env.ANESIS_PROPERTY_ID ?? COUNTRY_HOUSE_34.id; const spec = (await loadProperty(db, id)) ?? COUNTRY_HOUSE_34;
    for (const r of await verifyConnectors(spec)) console.log(`${r.id.padEnd(18)} ${r.status.padEnd(18)} ${String(r.ms).padStart(5)} ms  ${r.note}`);
  }
  else if (cmd === "status" && has("--json")) { console.log(JSON.stringify({ properties: await listProperties(db), jobs: await listJobs(db, 20), health: await health(db) }, null, 2)); }
  else if (cmd === "status") {
    console.log("properties:", (await listProperties(db)).map((p) => `${p.id} ${p.name}${p.simulated ? " (SIMULATED)" : ""}`).join("\n  ") || "none declared");
    console.log("jobs:", (await listJobs(db, 10)).map((j) => `${j.id} ${j.kind} ${j.state} ${j.key} attempts ${j.attempts}${j.lastError ? " error: " + j.lastError : ""}`).join("\n  ") || "none");
    console.log("models:", (await db.query<{ property_id: string; cycles: number; updated_at: string }>("select property_id, cycles, updated_at from property_models")).rows.map((r) => `${r.property_id} ${r.cycles} cycles, updated ${r.updated_at}`).join("\n  ") || "none");
    console.log("last traces:", (await db.query<{ type: string; state: string; at: string }>("select type, state, at from runtime_traces order by id desc limit 8")).rows.map((r) => `${r.at} ${r.type} ${r.state ?? ""}`).join("\n  ") || "none");
  }
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
} finally { await db.close(); }
