/**
 * Partnerships (T2) — contacte les partenaires potentiels (PMS, courtiers, guides). Sur `weekly.tick`,
 * prend un partenaire en attente et PROGRAMME sa prise de contact (retenue durable T2, fenêtre 2h + alerte).
 * IDEMPOTENT : ne recontacte pas un partenaire déjà en cours/contacté (statut).
 *
 * ⚠️ Simplification connue : `partners` est rattaché au mandat (RLS) — voir la migration 0009_partners.sql
 * (relation firme en réalité, à revisiter dès qu'un partenaire couvre plusieurs mandats).
 */
import type { Agent, AgentContext } from "../types.js";
import { notify } from "../helpers.js";
import { registerRetentionHandler } from "../retention.js";

const ACTION = "contact_partner";
const COMPENSATION = "Send a follow-up retraction to the partner";

// Handler de retenue : envoi réel via l'adaptateur (stub) + marque le partenaire contacté à l'exécution.
registerRetentionHandler(ACTION, (_ctx, input) => ({
  name: ACTION,
  tier: "T2",
  input,
  reversible: false,
  compensation: COMPENSATION,
  effect: async (client) => {
    await client.query("update partners set status = 'contacted' where id = $1", [String(input.partnerId)]);
  },
}));

async function onWeekly(ctx: AgentContext): Promise<void> {
  // un partenaire à la fois (garde la fenêtre de retenue lisible) ; seuls les 'pending' sont pris.
  const { rows } = await ctx.client.query(
    "select id, name from partners where mandate_id = $1 and status = 'pending' order by name limit 1",
    [ctx.mandateId],
  );
  const partner = rows[0];
  if (!partner) return; // rien à contacter → pas de run

  await ctx.startRun();
  const partnerId = String(partner.id);
  // marque 'contacting' tout de suite (idempotence : ne sera pas repris au prochain tick)
  await ctx.client.query("update partners set status = 'contacting', contacted_at = now() where id = $1", [partnerId]);
  await ctx.scheduleRetention({ name: ACTION, input: { partnerId, name: partner.name }, compensation: COMPENSATION });
  const eventId = await ctx.emit("retention.scheduled", { runId: ctx.runId, actionName: ACTION });
  await notify(ctx, eventId, {
    what: "Partner outreach scheduled (2-hour window)",
    why: `Reaching out to ${String(partner.name)}`,
    expectedAction: "Adjust or cancel within 2 hours if needed",
    priority: "normal",
  });
  // pas de completeRun : le run reste en retenue jusqu'au balayeur
}

export const partnerships: Agent = {
  id: "partnerships",
  ticks: ["weekly.tick"],
  run: async (ctx) => {
    if (ctx.trigger.kind !== "tick") return;
    await onWeekly(ctx);
  },
};
