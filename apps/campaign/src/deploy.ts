/**
 * Déploiement du schéma ANESIS sur une base Postgres NEUVE (Supabase/Neon). À exécuter UNE FOIS,
 * en connexion **propriétaire** (superuser/owner), AVANT la campagne :
 *
 *   node --env-file=.env.deploy --import tsx src/deploy.ts
 *
 * Fait deux choses, exactement comme le job CI `db-real-postgres` :
 *   1. applique toutes les migrations avec `{ roles: true }` (crée anesis_app, RLS, events append-only) ;
 *   2. donne à anesis_app un LOGIN + mot de passe (il est créé NOLOGIN) pour que l'app s'y connecte
 *      via le pooler transaction — jamais avec le rôle propriétaire.
 *
 * Secrets via l'environnement UNIQUEMENT (fichier .env.deploy NON commité) :
 *   DATABASE_URL_OWNER  = connexion directe propriétaire (migrations)
 *   APP_DB_PASSWORD     = mot de passe à poser sur anesis_app (celui de DATABASE_URL de la campagne)
 */
import pg from "pg";
import { deployDatabase } from "@anesis/db";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name} (voir le runbook §base).`);
  return v;
}

async function main(): Promise<void> {
  const ownerUrl = requireEnv("DATABASE_URL_OWNER");
  const appPassword = requireEnv("APP_DB_PASSWORD");
  if (!/^[A-Za-z0-9_@%+.\-]{12,}$/.test(appPassword)) {
    throw new Error("APP_DB_PASSWORD trop faible ou avec des caractères risqués (≥12, alphanumérique + _@%+.-).");
  }

  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    console.log("[1/3] Application des migrations (avec rôles)…");
    await deployDatabase((sql) => client.query(sql).then(() => undefined));

    console.log("[2/3] Attribution du login au rôle applicatif anesis_app…");
    // ALTER ROLE ... PASSWORD n'accepte pas de paramètre lié → on échappe les quotes du mot de passe.
    const safe = appPassword.replace(/'/g, "''");
    await client.query(`alter role anesis_app with login password '${safe}'`);

    console.log("[3/3] Vérification (rôle présent, login actif)…");
    const { rows } = await client.query("select rolcanlogin from pg_roles where rolname = 'anesis_app'");
    if (rows[0]?.rolcanlogin !== true) throw new Error("anesis_app n'a pas le login après ALTER ROLE — à investiguer.");

    console.log("\n✅ Base ANESIS prête. Prochaine étape : lancer la campagne avec DATABASE_URL = anesis_app via le pooler transaction.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(`\n[Échec déploiement] ${(e as Error).message}`);
  process.exitCode = 1;
});
