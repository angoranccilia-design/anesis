/**
 * Retenue durable T2 (§1b étape 4) — registre + balayeur. Les agents T2 (reputation, partnerships)
 * PROGRAMMENT une action via `ctx.scheduleRetention()` (aucun sleep en mémoire) et ENREGISTRENT ici un
 * handler qui reconstruit l'intention (avec son effet) à partir de l'input persisté. Le balayeur
 * (`retention-sweeper`, utilitaire système sur `hourly.tick`) mûrit les retenues échues non annulées :
 * il reprend le run d'origine et exécute via `ctx.actAfterRetention()` (re-authorize, sans sleep).
 * L'arrêt d'urgence a déjà annulé le run (`sleeping_retention → cancelled`), ce qui l'exclut du balayage.
 */
import { iso, type AgentRunId } from "@anesis/core";
import type { Agent, AgentContext, ToolIntent } from "./types.js";

/** Reconstruit l'intention T2 (avec effet) à partir de l'input persisté d'une retenue. */
export type RetentionHandler = (ctx: AgentContext, input: Record<string, unknown>) => ToolIntent;

const REGISTRY = new Map<string, RetentionHandler>();

/** Enregistre le handler d'une action T2 (appelé au chargement du module de l'agent). */
export function registerRetentionHandler(actionName: string, handler: RetentionHandler): void {
  REGISTRY.set(actionName, handler);
}

export const retentionSweeper: Agent = {
  id: "retention-sweeper",
  ticks: ["hourly.tick"],
  run: async (ctx: AgentContext) => {
    const { rows } = await ctx.client.query(
      `select r.id, r.run_id, r.action_name, r.input, r.created_at
       from retentions r
       join agent_runs ar on ar.id = r.run_id
       where r.status = 'pending' and r.due_at <= now() and r.mandate_id = $1 and ar.status = 'sleeping_retention'`,
      [ctx.mandateId],
    );

    for (const row of rows) {
      const handler = REGISTRY.get(String(row.action_name));
      if (!handler) continue; // action inconnue → on laisse (à corriger au niveau code)
      const input = (typeof row.input === "string" ? JSON.parse(row.input) : row.input) as Record<string, unknown>;
      const intent = handler(ctx, input);

      await ctx.resumeRun(row.run_id as AgentRunId); // exécute dans le run d'origine (attribution correcte)
      const outcome = await ctx.actAfterRetention(intent, iso(row.created_at as string | Date));

      if (outcome.kind === "allow") {
        await ctx.client.query("update retentions set status = 'executed' where id = $1", [row.id]);
        await ctx.completeRun(0, "measured");
      } else {
        // refusé (arrêt d'urgence survenu pendant le balayage) : on annule le run, la retenue reste tracée.
        await ctx.client.query("update agent_runs set status = 'cancelled', ended_at = now() where id = $1", [row.run_id]);
      }
    }
  },
};
