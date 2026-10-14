import "server-only";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * The autonomous runtime as the console's system of record. When DATABASE_URL or ANESIS_PGLITE_DIR is set, the console
 * reads and writes the same tables as the worker: properties, registers, imports, cycle results, contracts, model.
 * The runtime is loaded natively from its built ESM bundle (PGlite and pg carry WASM/native assets that a bundler breaks):
 * `pnpm --filter @anesis/runtime build`, or ANESIS_RUNTIME_BUNDLE pointing at dist/index.mjs.
 */
export type Runtime = typeof import("@anesis/runtime");
export type RuntimeHandle = { rt: Runtime; db: Awaited<ReturnType<Runtime["openDatabase"]>> };
const g = globalThis as unknown as { __anesisRuntime?: Promise<RuntimeHandle> };

import { demoMode } from "../demo";
export const runtimeConfigured = (): boolean => Boolean(process.env.DATABASE_URL || process.env.ANESIS_PGLITE_DIR) || demoMode();

export function getRuntime(): Promise<RuntimeHandle> {
  return (g.__anesisRuntime ??= (async () => {
    const local = join(process.cwd(), ".runtime", "index.mjs"); // copied by `prebuild`, so a deployed app carries its runtime
    const bundle = process.env.ANESIS_RUNTIME_BUNDLE ?? (existsSync(local) ? local : join(process.cwd(), "..", "..", "packages", "runtime", "dist", "index.mjs"));
    // Referenced here so the build traces PGlite (WASM assets), pg and xlsx into the deployed functions; the bundle imports them by name.
    await Promise.all([import("@electric-sql/pglite"), import("pg"), import("xlsx")]);
    const rt = (await import(/* webpackIgnore: true */ pathToFileURL(bundle).href)) as Runtime;
    const db = await rt.openDatabase(); await rt.migrate(db);
    if (demoMode()) { const { ensureDemoSeed } = await import("../console/seed"); await ensureDemoSeed(rt, db); }
    return { rt, db };
  })());
}
