/**
 * Gardes d'EXÉCUTION (pas des tests unitaires) — à appeler à chaque démarrage de l'application.
 * Elles transforment deux réserves « à vérifier en prod » en échecs bruyants au boot.
 */
import { withMandate, type SqlClient } from "./context.js";

export const EXPECTED_APP_ROLE = "anesis_app";

/**
 * Réserve 2 — l'application doit se connecter comme rôle applicatif, JAMAIS comme propriétaire.
 * Un propriétaire/superuser contourne la RLS : s'y connecter réduit l'isolation à néant.
 */
export async function assertAppRole(client: SqlClient): Promise<void> {
  const { rows } = await client.query("select current_user as role");
  const role = rows[0]?.role;
  if (role !== EXPECTED_APP_ROLE) {
    throw new Error(
      `ANESIS refuse de démarrer : connecté comme '${String(role)}', attendu '${EXPECTED_APP_ROLE}'. ` +
        `La chaîne de connexion de production doit utiliser le rôle applicatif, jamais le rôle propriétaire.`,
    );
  }
}

/**
 * Réserve 1 (cœur) — vérifie que `app.mandate_id` est bien TRANSACTION-LOCAL sur CETTE connexion :
 * on pose un contexte via withMandate (COMMIT), puis on lit hors transaction. S'il persiste, le pooler
 * est en mode SESSION (ou mal configuré) et l'isolation fuit d'une transaction à l'autre → on échoue.
 * Ne remplace PAS le rejeu multi-connexions sur vrai Postgres, mais attrape le mode session au boot.
 */
export async function assertTransactionScopedGuc(client: SqlClient): Promise<void> {
  await withMandate(client, "__selfcheck__", async () => {
    /* pose puis relâche le contexte */
  });
  const { rows } = await client.query("select nullif(current_setting('app.mandate_id', true), '') as m");
  if (rows[0]?.m != null) {
    throw new Error(
      "app.mandate_id persiste après COMMIT : le pooler est en mode SESSION ou mal configuré. " +
        "ANESIS exige le mode TRANSACTION (set_config(..., true) scopé transaction).",
    );
  }
}

/** À appeler au boot : enchaîne les deux gardes. */
export async function assertProductionSafety(client: SqlClient): Promise<void> {
  await assertAppRole(client);
  await assertTransactionScopedGuc(client);
}
