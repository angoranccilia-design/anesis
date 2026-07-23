/**
 * Underwriter — orchestre la Porte 1 : appelle @anesis/assessment (collecte + score), écrit
 * l'évaluation, remplit les champs ICP de la Property et fait transiter son état, en émettant les
 * événements property.*. Il suit EXACTEMENT le même chokepoint `ctx.act()` que les 3 agents prouvés
 * (action interne T0). Aucun nouveau concept de runtime.
 */
import { DEFAULT_CONFIG, collect, score, type AssessmentConfig, type RawObservations } from "@anesis/assessment";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, PropertyId } from "@anesis/core";
import type { SqlClient } from "@anesis/db";
import type { EventBus } from "@anesis/events";
import { AgentRuntime } from "../runtime.js";
import type { AgentContext } from "../types.js";
import { uid } from "../helpers.js";

export interface ProspectRow {
  readonly id: string;
  readonly name: string;
  readonly website: string | null;
}

export interface UnderwriterDeps {
  /** Récupère les observations publiques (IO) pour une Property — injecté pour rester testable. */
  fetchObservations(property: ProspectRow): Promise<RawObservations>;
  config?: AssessmentConfig;
}

// La revue manuelle laisse la Property à 'assessed' (en attente d'un humain) ; sinon état final.
const FINAL_STATE: Record<string, string> = { qualified: "qualified", declined: "declined", needs_review: "assessed" };

export async function assessOneProperty(ctx: AgentContext, deps: UnderwriterDeps, property: ProspectRow): Promise<void> {
  await ctx.startRun();

  const raw = await deps.fetchObservations(property); // Phase 1 (IO)
  const signals = collect(raw); // Phase 1 (normalisation pure)
  const assessment = score(signals, deps.config ?? DEFAULT_CONFIG); // Phase 2 (pur, déterministe)
  const finalState = FINAL_STATE[assessment.decision] ?? "assessed";

  await ctx.act({
    name: "record_assessment",
    tier: "T0",
    input: { propertyId: property.id, decisionCode: assessment.decisionCode },
    effect: async (client) => {
      await client.query(
        `insert into assessments (id, property_id, leak_index, monthly_loss_pence, decision, decision_code, icp, sub_scores)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
        [
          uid("assess"),
          property.id,
          assessment.leakIndex,
          assessment.monthlyLoss.pence,
          assessment.decision,
          assessment.decisionCode,
          JSON.stringify(assessment.icp),
          JSON.stringify(assessment.subScores),
        ],
      );
      await client.query(
        `update properties
         set state = $2, keys = $3, avg_nightly_rate_pence = $4, ota_share_pct = $5, has_in_house_marketing = $6, updated_at = now()
         where id = $1`,
        [
          property.id,
          finalState,
          assessment.icp.keys.value,
          assessment.icp.adrPence.value,
          assessment.icp.otaSharePct.value,
          assessment.icp.hasInHouseMarketing.value,
        ],
      );
    },
  });

  const propertyId = asId<PropertyId>(property.id);
  await ctx.emit("property.assessed", { propertyId, leakIndex: assessment.leakIndex });
  if (assessment.decision === "qualified") {
    await ctx.emit("property.qualified", { propertyId, monthlyLoss: assessment.monthlyLoss });
  } else if (assessment.decision === "declined") {
    await ctx.emit("property.declined", { propertyId, reasonCode: assessment.decisionCode });
  } else {
    await ctx.emit("property.needs_review", { propertyId, reasonCode: assessment.decisionCode });
  }

  await ctx.completeRun(0, "measured"); // autonome : aucune minute humaine
}

export interface BatchResult {
  readonly processed: number;
}

/**
 * Lot du 4 août — évalue les prospects. Idempotent et REPRENABLE : ne traite que les Property à l'état
 * 'prospect' ; une fois évaluée, une Property en sort et n'est plus reprise (l'état joue le rôle du
 * journal d'idempotence). Une reprise après interruption ne retraite pas ce qui est déjà fait.
 */
export async function assessProspectBatch(
  client: SqlClient,
  bus: EventBus,
  deps: UnderwriterDeps,
  opts: { correlationId: CorrelationId; batchSize?: number },
): Promise<BatchResult> {
  const rt = new AgentRuntime(client, bus, {});
  const { rows } = await client.query(
    "select id, name, website from properties where state = 'prospect' order by priority desc, id asc limit $1",
    [opts.batchSize ?? 200],
  );
  let processed = 0;
  for (const row of rows) {
    await rt.runSystem("underwriter", opts.correlationId, async (ctx) => {
      await assessOneProperty(ctx, deps, {
        id: String(row.id),
        name: String(row.name),
        website: (row.website as string | null) ?? null,
      });
    });
    processed += 1;
  }
  return { processed };
}
