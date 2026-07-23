import { describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { assertAppRole, assertTransactionScopedGuc } from "../runtime-guard.js";
import type { SqlClient } from "../context.js";

describe("assertAppRole — réserve 2 (contrôle de démarrage)", () => {
  it("passe quand connecté comme anesis_app", async () => {
    const pg = await makeTestDb({ asApp: true });
    await expect(assertAppRole(pg)).resolves.toBeUndefined();
  });

  it("échoue bruyamment quand connecté comme propriétaire/superuser", async () => {
    const pg = await makeTestDb(); // rôle par défaut = superuser (contourne la RLS)
    await expect(assertAppRole(pg)).rejects.toThrow(/anesis_app/);
  });
});

describe("assertTransactionScopedGuc — réserve 1 (mode transaction du pooler)", () => {
  it("passe quand le GUC est transaction-local (réinitialisé au COMMIT)", async () => {
    const pg = await makeTestDb({ asApp: true });
    await expect(assertTransactionScopedGuc(pg)).resolves.toBeUndefined();
  });

  it("échoue si un contexte de session persiste (simulateur de mode SESSION)", async () => {
    const pg: SqlClient = await makeTestDb({ asApp: true });
    await pg.query("select set_config('app.mandate_id', 'leak', false)"); // session-scoped = mode session
    await expect(assertTransactionScopedGuc(pg)).rejects.toThrow(/SESSION|persiste/);
    await pg.query("select set_config('app.mandate_id', '', false)");
  });
});
