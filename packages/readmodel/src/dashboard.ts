/**
 * Vue dashboard client — un seul établissement, lue dans le CONTEXTE DE SON MANDAT via `withMandate()`
 * (isolation RLS de 0001). Un client ne voit jamais que ses propres données.
 */
import { withMandate, type SqlClient } from "@anesis/db";
import type {
  ClientDashboard,
  DashboardAgentTasks,
  DashboardCommercialTerms,
  DashboardLossLine,
  DashboardObjective,
  MandateStateView,
} from "./types.js";

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export async function clientDashboard(client: SqlClient, mandateId: string): Promise<ClientDashboard | null> {
  return withMandate(client, mandateId, async () => {
    const m = (
      await client.query(
        `select m.id, p.name as property_name, p.region, m.state, t.leak_index,
                m.formula, m.term_months, m.incentive_rate, m.monthly_subscription_pence, m.photo_sessions
         from mandates m
         join properties p on p.id = m.property_id
         left join theses t on t.id = m.thesis_id
         where m.id = $1`,
        [mandateId],
      )
    ).rows[0];
    if (!m) return null;

    const lossLines: DashboardLossLine[] = (
      await client.query(
        "select pillar, annual_loss_pence, root_cause from loss_lines where mandate_id = $1 order by annual_loss_pence desc",
        [mandateId],
      )
    ).rows.map((r) => ({
      pillar: String(r.pillar),
      annualLossPence: num(r.annual_loss_pence),
      rootCause: String(r.root_cause),
    }));

    const objectives: DashboardObjective[] = (
      await client.query(
        "select id, title, target_recovery_pence from objectives where mandate_id = $1 order by target_recovery_pence desc",
        [mandateId],
      )
    ).rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      targetRecoveryPence: num(r.target_recovery_pence),
    }));

    const tasksByAgent: DashboardAgentTasks[] = (
      await client.query(
        `select assigned_agent as agent, count(*)::int as count
         from tasks where mandate_id = $1 and assigned_agent is not null
         group by assigned_agent order by assigned_agent`,
        [mandateId],
      )
    ).rows.map((r) => ({ agent: String(r.agent), count: num(r.count) }));

    const commercialTerms: DashboardCommercialTerms | null =
      m.formula == null || m.term_months == null
        ? null
        : {
            formula: String(m.formula) as DashboardCommercialTerms["formula"],
            termMonths: num(m.term_months),
            incentiveRate: num(m.incentive_rate),
            monthlySubscriptionPence: num(m.monthly_subscription_pence),
            photoSessions: num(m.photo_sessions),
          };

    return {
      mandateId: String(m.id),
      propertyName: String(m.property_name),
      region: String(m.region),
      state: String(m.state) as MandateStateView,
      leakIndex: numOrNull(m.leak_index),
      commercialTerms,
      recoverableAnnualPence: lossLines.reduce((s, l) => s + l.annualLossPence, 0),
      lossLines,
      objectives,
      tasksByAgent,
    };
  });
}
