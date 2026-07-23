/**
 * Point UNIQUE où les migrations sont appliquées avec le rôle applicatif (réserve 2).
 * Le pipeline de déploiement / setup d'environnement appelle `deployDatabase` — c'est ici, et
 * nulle part ailleurs, que `{ roles: true }` est réellement invoqué. La 0002_roles.sql n'est donc
 * pas « disponible mais jamais appliquée » : elle fait partie du chemin de déploiement.
 */
import { applyMigrations, type SqlExec } from "./migrate.js";

export async function deployDatabase(exec: SqlExec): Promise<void> {
  // roles: true → crée anesis_app et révoque UPDATE/DELETE sur events. L'app se connecte ENSUITE
  // avec anesis_app (voir assertAppRole), jamais avec le rôle propriétaire qui exécute ces migrations.
  await applyMigrations(exec, { roles: true });
}
