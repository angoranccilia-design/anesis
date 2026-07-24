/**
 * Pattern d'approbation bloquante (T3/T4/T5), partagé par les agents qui exigent l'accord humain
 * (lifecycle, rate-distribution, content-creator, art-director). Deux étapes, exactement comme
 * media-buyer : `requestApproval` (propose → `require_approval` → crée l'Approval + notifie + suspend)
 * puis `resumeOnApproval` (au grant → reprend le run → `act(approval)` → exécute → clôt).
 *
 * GARDE D'APPARTENANCE (essentielle en coexistence) : plusieurs agents écoutent `human.approval_granted` ;
 * `resumeOnApproval` ne traite QUE l'approbation dont le `tool_call_name` est celui de l'agent — sinon
 * un agent reprendrait le run d'un autre. `ctx.act()` reste le SEUL point d'exécution.
 */
import { iso, type Approval, type ApprovalId, type AgentRunId, type AutonomyTier, type MandateId, type Money, type OperatorId } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import type { SqlClient } from "@anesis/db";
import type { AgentContext, ToolIntent } from "../types.js";
import { notify, uid } from "../helpers.js";

export interface RequestApprovalOpts {
  readonly runId: AgentRunId;
  readonly actionName: string;
  readonly tier: AutonomyTier;
  readonly input: unknown;
  readonly reason: string;
  readonly notifyWhat: string;
  readonly expectedAction: string;
  readonly reversible?: boolean;
  readonly compensation?: string;
  readonly amountPence?: number | null;
}

/** Propose l'action : `act()` → `require_approval` → crée l'Approval, émet la demande + notif, suspend. */
export async function requestApproval(ctx: AgentContext, opts: RequestApprovalOpts): Promise<void> {
  const intent: ToolIntent = {
    name: opts.actionName,
    tier: opts.tier,
    input: opts.input,
    reversible: opts.reversible,
    compensation: opts.compensation,
    effect: async () => undefined, // rien ne s'exécute tant que non approuvé
  };
  const outcome = await ctx.act(intent);
  if (outcome.kind !== "require_approval") return;

  const approvalId = uid("appr");
  await ctx.client.query(
    `insert into approvals (id, mandate_id, run_id, tool_call_name, tier, reason, amount_pence, status, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, 'pending', now() + interval '48 hours')`,
    [approvalId, ctx.mandateId, opts.runId, opts.actionName, opts.tier, opts.reason, opts.amountPence ?? null],
  );

  const amount: Money | null = opts.amountPence != null ? { currency: "GBP", pence: opts.amountPence } : null;
  const eventId = await ctx.emit("human.approval_requested", { approvalId: asId<ApprovalId>(approvalId), runId: opts.runId, amount });
  await notify(ctx, eventId, { what: opts.notifyWhat, why: opts.reason, expectedAction: opts.expectedAction, priority: "high" });
  await ctx.suspendForApproval();
}

export interface ResumeOnApprovalOpts {
  readonly actionName: string;
  readonly tier: AutonomyTier;
  readonly humanMinutes: number;
  readonly reversible?: boolean;
  readonly compensation?: string;
  /** Effet réel, exécuté UNIQUEMENT si `act(approval)` renvoie `allow`. */
  readonly effect: (client: SqlClient, approval: Approval) => Promise<unknown>;
  /** Émis par l'agent APRÈS l'autorisation (ex: artifact.produced), avant la clôture du run. */
  readonly onAllowed?: () => Promise<void>;
}

/** Au grant : garde d'appartenance, reprend le run, rejoue `act()` avec l'Approval → exécute → clôt. */
export async function resumeOnApproval(ctx: AgentContext, approvalId: string, opts: ResumeOnApprovalOpts): Promise<void> {
  const { rows } = await ctx.client.query("select * from approvals where id = $1", [approvalId]);
  const row = rows[0];
  // garde d'appartenance : ni introuvable, ni non accordée, ni l'action d'un AUTRE agent
  if (!row || row.status !== "granted" || row.tool_call_name !== opts.actionName) return;

  await ctx.resumeRun(row.run_id as AgentRunId);

  const approval: Approval = {
    id: asId<ApprovalId>(String(row.id)),
    mandateId: asId<MandateId>(String(row.mandate_id)),
    runId: row.run_id as AgentRunId,
    toolCallName: String(row.tool_call_name),
    tier: opts.tier,
    reason: String(row.reason),
    payload: {},
    amount: row.amount_pence != null ? { currency: "GBP", pence: Number(row.amount_pence) } : null,
    status: "granted",
    requestedAt: iso(row.requested_at as string | Date),
    expiresAt: row.expires_at != null ? iso(row.expires_at as string | Date) : null,
    decidedBy: asId<OperatorId>(String(row.decided_by)),
    decidedAt: iso(row.decided_at as string | Date),
  };

  const intent: ToolIntent = {
    name: opts.actionName,
    tier: opts.tier,
    input: {},
    reversible: opts.reversible,
    compensation: opts.compensation,
    approval,
    effect: (client) => opts.effect(client, approval),
  };

  const outcome = await ctx.act(intent);
  if (outcome.kind !== "allow") return;

  if (opts.onAllowed) await opts.onAllowed();
  await ctx.completeRun(opts.humanMinutes, "measured");
}
