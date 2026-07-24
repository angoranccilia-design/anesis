/**
 * CLI de campagne — À EXÉCUTER pour le lot de diagnostics du 3 août, sur le Postgres ANESIS réel.
 *
 *   node --env-file=.env dist/run.js [chemin/prospects.csv|.json]
 *
 * Secrets UNIQUEMENT via l'environnement (jamais en argument) — voir docs/campagne-3-aout-runbook.md :
 *   DATABASE_URL, PAGESPEED_API_KEY, APIFY_TOKEN, APIFY_REVIEWS_ACTOR.
 * Le schéma doit déjà être déployé (deployDatabase, en connexion propriétaire) — ce CLI se connecte
 * comme rôle applicatif et n'applique PAS les migrations.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId } from "@anesis/core";
import type { SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { runCampaign, type UnderwriterDeps } from "@anesis/agent-runtime";
import { buildProspectFetcher, runApifyPreflight } from "@anesis/sources";
import { formatFromPath, parseProspects } from "./prospects.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name} (voir le runbook).`);
  return v;
}

async function main(): Promise<void> {
  const prospectsPath = process.argv[2];

  // 1) Pré-vol Apify (informe sur le budget restant — n'échoue pas le lot).
  try {
    const pre = await runApifyPreflight(process.env, undefined, 150);
    console.log(`\n[Pré-vol Apify] ${pre.ok ? "OK" : "ATTENTION"} — ${pre.note}`);
  } catch (e) {
    console.log(`\n[Pré-vol Apify] ignoré : ${(e as Error).message}`);
  }

  // 2) Connexion Postgres (rôle applicatif) → SqlClient.
  const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });
  const client: SqlClient = {
    query: async (sql, params) => {
      const r = await pool.query(sql, params as unknown[]);
      return { rows: r.rows as Array<Record<string, unknown>> };
    },
  };

  try {
    const bus = new EventBus(client);
    const deps: UnderwriterDeps = { fetchObservations: buildProspectFetcher(process.env) };

    const prospects = prospectsPath
      ? parseProspects(readFileSync(prospectsPath, "utf8"), formatFromPath(prospectsPath))
      : undefined;
    if (prospects) console.log(`[Import] ${prospects.length} prospects lus depuis ${prospectsPath}`);

    const report = await runCampaign(client, bus, deps, {
      correlationId: asId<CorrelationId>(`campaign-${Date.now()}`),
      prospects,
    });

    console.log("\n===== RAPPORT DE CAMPAGNE =====");
    console.log(`  Importés          : ${report.imported} (doublons ignorés : ${report.skipped})`);
    console.log(`  Évalués (ce lot)  : ${report.processed}`);
    console.log(`  Qualifiés         : ${report.qualified}`);
    console.log(`  Refusés           : ${report.declined}`);
    console.log(`  À revoir (manuel) : ${report.needsReview}`);
    if (report.reviewQueue.length > 0) {
      console.log("\n  File de revue manuelle (à trancher sous quelques heures) :");
      for (const item of report.reviewQueue) {
        console.log(`   - ${item.name} [${item.decisionCode}] leakIndex=${item.leakIndex}`);
      }
    }
    console.log("");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(`\n[Échec campagne] ${(e as Error).message}`);
  process.exitCode = 1;
});
