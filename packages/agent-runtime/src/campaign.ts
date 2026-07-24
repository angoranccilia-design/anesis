/**
 * Orchestrateur de la campagne de diagnostics (4 août). Enchaîne, sur un Postgres réel :
 *   import prospects (dédup domaine) → lot d'évaluation (underwriter, sources RÉELLES via UnderwriterDeps)
 *   → comptes de sortie + file de revue manuelle à traiter.
 * PUR de tout secret : les IO passent par `deps.fetchObservations` (construit ailleurs depuis l'env).
 * Idempotent/reprenable via l'état des Property (voir assessProspectBatch).
 */
import type { CorrelationId, PropertyImportRow } from "@anesis/core";
import { importProperties, type SqlClient } from "@anesis/db";
import type { EventBus } from "@anesis/events";
import { assessProspectBatch, type UnderwriterDeps } from "./agents/underwriter.js";
import { listManualReviewQueue, type ManualReviewItem } from "./review-queue.js";
import { uid } from "./helpers.js";

export interface CampaignReport {
  readonly imported: number;
  readonly skipped: number; // doublons de domaine ignorés à l'import
  readonly processed: number; // prospects évalués dans ce lot
  readonly qualified: number;
  readonly declined: number;
  readonly needsReview: number;
  readonly reviewQueue: readonly ManualReviewItem[]; // à trancher à la main sous quelques heures
}

export interface RunCampaignOptions {
  readonly correlationId: CorrelationId;
  /** Optionnel : prospects à importer AVANT le lot (sinon on évalue les 'prospect' déjà en base). */
  readonly prospects?: readonly PropertyImportRow[];
  readonly batchSize?: number;
}

export async function runCampaign(
  client: SqlClient,
  bus: EventBus,
  deps: UnderwriterDeps,
  opts: RunCampaignOptions,
): Promise<CampaignReport> {
  let imported = 0;
  let skipped = 0;
  if (opts.prospects && opts.prospects.length > 0) {
    const r = await importProperties(client, opts.prospects, () => uid("prop"));
    imported = r.inserted;
    skipped = r.skipped;
  }

  const { processed } = await assessProspectBatch(client, bus, deps, {
    correlationId: opts.correlationId,
    batchSize: opts.batchSize,
  });

  const counts = await client.query("select state, count(*)::int as n from properties group by state");
  const byState = Object.fromEntries(counts.rows.map((r) => [String(r.state), Number(r.n)]));
  const reviewQueue = await listManualReviewQueue(client);

  return {
    imported,
    skipped,
    processed,
    qualified: byState.qualified ?? 0,
    declined: byState.declined ?? 0,
    needsReview: reviewQueue.length,
    reviewQueue,
  };
}
