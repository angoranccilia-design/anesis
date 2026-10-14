/**
 * Lifecycle — the only way a contract changes state. Wraps the engine's budget lifecycle (PROPOSED → APPROVED →
 * AUTHORISED → IN_EXECUTION → CLOSED, humans only past PROPOSED) instead of duplicating it. Every transition appends a
 * history event; the origin hash never changes; forbidden transitions throw.
 *
 * Budget governance (audit finding C3): the contract itself is the budget authority. Its `budgetStatus` and
 * `approvedCost` are what the engine's budget lifecycle recorded, and every transition checks them whether or not the
 * caller hands over a budget record. A budget record given by the caller must match the contract; it is never a way
 * round the checks. An UNKNOWN cost is never read as zero: authorisation needs an approved amount that a human stated
 * or that a known estimate supplies.
 */
import { transitionBudget, unknown, type InterventionBudget } from "@anesis/engine";
import { frozenView, canonical, type InterventionContract, type ExecutionState, type HistoryEvent } from "./contract.js";

const ALLOWED: Record<ExecutionState, ExecutionState[]> = {
  PREPARED: ["SUBMITTED", "WITHDRAWN"], SUBMITTED: ["AUTHORISED", "REJECTED", "WITHDRAWN"], AUTHORISED: ["IN_EXECUTION", "WITHDRAWN"],
  IN_EXECUTION: ["EXECUTED", "WITHDRAWN"], EXECUTED: ["MEASURED", "CLOSED"], MEASURED: ["CLOSED"], CLOSED: [], REJECTED: [], WITHDRAWN: [],
};
export interface Actor { readonly by: string; readonly human: boolean; readonly at: string }
export interface TransitionInput { readonly to: ExecutionState; readonly actor: Actor; readonly note?: string; readonly evidence?: readonly string[]; readonly approvedAmountGbp?: number; readonly budget?: InterventionBudget }

/** The engine's budget record as the contract carries it. Lines the contract does not keep (actual spend, provider cost, revenue) are UNKNOWN. */
export function budgetFromContract(c: InterventionContract): InterventionBudget {
  return {
    interventionId: c.decisionPackageRef.interventionId, estimated: c.estimatedBudget, approved: c.approvedCost,
    actualSpend: unknown("actual_spend", "not kept on the contract"), providerCost: unknown("provider_cost", "not kept on the contract"), anesisRevenue: unknown("anesis_revenue", "the partnership fee is a separate line"),
    status: c.budgetStatus, approvalRequired: true, approvalLevel: c.approvalLevel, fundingSource: c.funding.source, fundingNote: c.funding.note, partnershipSeparate: true,
  };
}

function budgetFor(c: InterventionContract, given: InterventionBudget | undefined): InterventionBudget {
  if (!given) return budgetFromContract(c);
  if (given.interventionId !== c.decisionPackageRef.interventionId) throw new Error(`${c.id}: the budget record belongs to ${given.interventionId}, not to ${c.decisionPackageRef.interventionId}`);
  if (given.status !== c.budgetStatus) throw new Error(`${c.id}: the budget record says ${given.status} but the contract's budget is ${c.budgetStatus}; the contract is the authority`);
  return given;
}

export function transition(c: InterventionContract, t: TransitionInput): { contract: InterventionContract; budget: InterventionBudget } {
  if (!ALLOWED[c.state].includes(t.to)) throw new Error(`${c.id}: ${c.state} → ${t.to} is not allowed`);
  let budget = budgetFor(c, t.budget);
  if (t.to === "AUTHORISED") {
    if (!t.actor.human) throw new Error(`${c.id}: AUTHORISED requires a named human (L${c.approvalLevel}); the engine cannot authorise its own recommendation`);
    if (!t.actor.by || t.actor.by === "engine") throw new Error(`${c.id}: an authorisation must name the person`);
    if (c.prerequisites.status === "UNRESOLVED") throw new Error(`${c.id}: prerequisites unmet: ${c.prerequisites.unmet.join("; ")}`);
    if (c.dataRequest) throw new Error(`${c.id}: a data request is open; the intervention cannot be authorised on insufficient evidence`);
    if (budget.status !== "PROPOSED" && budget.status !== "APPROVED") throw new Error(`${c.id}: the budget is ${budget.status}; only a PROPOSED or APPROVED budget can be authorised`);
    const stated = t.approvedAmountGbp;
    if (stated !== undefined && !(Number.isFinite(stated) && stated >= 0)) throw new Error(`${c.id}: an approved amount must be a finite, non-negative number of pounds`);
    const amount = stated ?? (budget.estimated.status !== "UNKNOWN" ? budget.estimated.amountGbp : null);
    if (amount === null) throw new Error(`${c.id}: the approved cost cannot be established — the estimate is UNKNOWN and no approved amount was stated; UNKNOWN is not zero`);
    if (budget.status === "PROPOSED") budget = transitionBudget(budget, "APPROVED", { human: true, amountGbp: amount });
    budget = transitionBudget(budget, "AUTHORISED", { human: true });
  }
  if (t.to === "IN_EXECUTION") {
    if (budget.status !== "AUTHORISED") throw new Error(`${c.id}: execution needs an AUTHORISED budget (is ${budget.status}); no spend is engaged without a human authorisation`);
    if (budget.approved.status !== "OBSERVED" || budget.approved.amountGbp === null) throw new Error(`${c.id}: the budget is marked AUTHORISED but its approved cost is ${budget.approved.status}; execution needs a known approved amount`);
    budget = transitionBudget(budget, "IN_EXECUTION", { human: t.actor.human });
  }
  if (t.to === "EXECUTED" && !(t.evidence && t.evidence.length)) throw new Error(`${c.id}: EXECUTED requires execution evidence; a report without proof is not an execution`);
  if (t.to === "MEASURED" && !(t.evidence && t.evidence.length)) throw new Error(`${c.id}: MEASURED requires a measurement record`);
  if (t.to === "CLOSED" && budget.status === "IN_EXECUTION") budget = transitionBudget(budget, "CLOSED", { human: t.actor.human });
  if ((t.to === "REJECTED" || t.to === "WITHDRAWN") && (budget.status === "PROPOSED" || budget.status === "APPROVED")) budget = transitionBudget(budget, "REJECTED", { human: t.actor.human });
  const ev: HistoryEvent = { seq: c.history.length + 1, at: t.actor.at, by: t.actor.by, human: t.actor.human, from: c.state, to: t.to, note: t.note ?? "", evidence: t.evidence ?? [] };
  return { contract: { ...c, state: t.to, version: c.version + 1, history: [...c.history, ev], approvedCost: budget.approved, budgetStatus: budget.status }, budget };
}

/** The origin must never drift: the hash of the decision-time fields must still equal originSha256. */
export function originIntact(c: InterventionContract, sha256Hex: (s: string) => string): boolean { return sha256Hex(canonical(frozenView(c))) === c.originSha256; }
