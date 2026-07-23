/** @anesis/db — persistance ANESIS : schéma Drizzle, migrations, RLS par mandat, events append-only. */
export * as schema from "./schema.js";
export { applyMigrations, type SqlExec } from "./migrate.js";
export { withMandate, type SqlClient } from "./context.js";
export { importProperties, type ImportResult } from "./import-properties.js";
export { deployDatabase } from "./deploy.js";
export {
  assertAppRole,
  assertTransactionScopedGuc,
  assertProductionSafety,
  EXPECTED_APP_ROLE,
} from "./runtime-guard.js";
