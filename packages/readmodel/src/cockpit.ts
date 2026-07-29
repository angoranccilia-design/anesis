/**
 * Vue cockpit fondatrice — LECTURE TRANSVERSALE de tous les mandats via `withFounder()` (policies
 * `*_founder_read`, migration 0010). Lecture seule : aucune écriture n'est faite ici.
 */
import { withFounder, type SqlClient } from "@anesis/db";
import type {
  CockpitApprovalRow,
  CockpitMandateRow,
  CockpitOverview,
  MandateStateView,
} from "./types.js";

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export async function cockpitOverview(client: SqlClient): Promise<CockpitOverview> {
  return withFounder(client, async () => {
    const mandateRows = (
      await client.query(`
        select
          m.id                                   as mandate_id,
          p.name                                 as property_name,
          p.region                               as region,
          m.state                                as state,
          t.leak_index                           as leak_index,
          m.formula                              as formula,
          m.term_months                          as term_months,
          m.incentive_rate                       as incentive_rate,
          m.monthly_subscription_pence           as monthly_subscription_pence,
          (select count(*) from objectives o where o.mandate_id = m.id)                        as objectives_count,
          (select count(*) from tasks tk where tk.mandate_id = m.id)                           as tasks_count,
          (select count(*) from approvals a where a.mandate_id = m.id and a.status = 'pending') as pending_approvals,
          coalesce((select sum(ar.human_minutes_spent) from agent_runs ar where ar.mandate_id = m.id), 0) as human_minutes
        from mandates m
        join properties p on p.id = m.property_id
        left join theses t on t.id = m.thesis_id
        order by p.name
      `)
    ).rows;

    const mandates: CockpitMandateRow[] = mandateRows.map((r) => ({
      mandateId: String(r.mandate_id),
      propertyName: String(r.property_name),
      region: String(r.region),
      state: String(r.state) as MandateStateView,
      leakIndex: numOrNull(r.leak_index),
      formula: (r.formula as CockpitMandateRow["formula"]) ?? null,
      termMonths: numOrNull(r.term_months),
      incentiveRate: numOrNull(r.incentive_rate),
      objectivesCount: num(r.objectives_count),
      tasksCount: num(r.tasks_count),
      pendingApprovals: num(r.pending_approvals),
      humanMinutes: num(r.human_minutes),
    }));

    const approvalRows = (
      await client.query(`
        select a.id, a.mandate_id, p.name as property_name, a.tool_call_name, a.tier, a.status,
               a.decided_by, a.requested_at, a.amount_pence
        from approvals a
        join mandates m on m.id = a.mandate_id
        join properties p on p.id = m.property_id
        where a.status = 'pending'
        order by a.requested_at asc
      `)
    ).rows;

    const pendingApprovals: CockpitApprovalRow[] = approvalRows.map((r) => ({
      approvalId: String(r.id),
      mandateId: String(r.mandate_id),
      propertyName: String(r.property_name),
      toolCallName: String(r.tool_call_name),
      tier: String(r.tier) as CockpitApprovalRow["tier"],
      status: String(r.status) as CockpitApprovalRow["status"],
      decidedBy: r.decided_by == null ? null : String(r.decided_by),
      requestedAt: new Date(String(r.requested_at)).toISOString(),
      amountPence: numOrNull(r.amount_pence),
    }));

    const monthlyRecurringPence = mandateRows
      .filter((r) => r.state === "active")
      .reduce((sum, r) => sum + num(r.monthly_subscription_pence), 0);

    return {
      mandates,
      pendingApprovals,
      totals: {
        mandates: mandates.length,
        pendingApprovals: pendingApprovals.length,
        humanMinutes: mandates.reduce((s, m) => s + m.humanMinutes, 0),
        monthlyRecurringPence,
      },
    };
  });
}
