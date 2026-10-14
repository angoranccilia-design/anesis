/**
 * Lifecycle — the only way a contract changes state. Wraps the engine's budget lifecycle (PROPOSED → APPROVED →
 * AUTHORISED → IN_EXECUTION → CLOSED, humans only past PROPOSED) instead of duplicating it. Every transition appends a
 * history event; the origin hash never changes; forbidden transitions throw.
 */
import { transitionBudget, type InterventionBudget } from "@anesis/engine";
import { frozenView, canonical, type InterventionContract, type ExecutionState, type HistoryEvent } from "./contract.js";

const ALLOWED: Record<ExecutionState, ExecutionState[]> = {
  PREPARED: ["SUBMITTED", "WITHDRAWN"], SUBMITTED: ["AUTHORISED", "REJECTED", "WITHDRAWN"], AUTHORISED: ["IN_EXECUTION", "WITHDRAWN"],
  IN_EXECUTION: ["EXECUTED", "WITHDRAWN"], EXECUTED: ["MEASURED", "CLOSED"], MEASURED: ["CLOSED"], CLOSED: [], REJECTED: [], WITHDRAWN: [],
};
export interface Actor { readonly by: string; readonly human: boolean; readonly at: string }
export interface TransitionInput { readonly to: ExecutionState; readonly actor: Actor; readonly note?: string; readonly evidence?: readonly string[]; readonly approvedAmountGbp?: number; readonly budget?: InterventionBudget }

export function transition(c: InterventionContract, t: TransitionInput): { contract: InterventionContract; budget: InterventionBudget | null } {
  if (!ALLOWED[c.state].includes(t.to)) throw new Error(`${c.id}: ${c.state} → ${t.to} is not allowed`);
  let budget: InterventionBudget | null = t.budget ?? null;
  if (t.to === "AUTHORISED") {
    if (!t.actor.human) throw new Error(`${c.id}: AUTHORISED requires a named human (L${c.approvalLevel}); the engine cannot authorise its own recommendation`);
    if (!t.actor.by || t.actor.by === "engine") throw new Error(`${c.id}: an authorisation must name the person`);
    if (c.prerequisites.status === "UNRESOLVED") throw new Error(`${c.id}: prerequisites unmet: ${c.prerequisites.unmet.join("; ")}`);
    if (c.dataRequest) throw new Error(`${c.id}: a data request is open; the intervention cannot be authorised on insufficient evidence`);
    if (budget) { budget = transitionBudget(budget, "APPROVED", { human: true, amountGbp: t.approvedAmountGbp }); budget = transitionBudget(budget, "AUTHORISED", { human: true }); }
  }
  if (t.to === "IN_EXECUTION") {
    if (budget && budget.status !== "AUTHORISED" && budget.fundingSource !== "included_in_partnership") throw new Error(`${c.id}: execution needs an AUTHORISED budget (is ${budget.status})`);
    if (budget) budget = transitionBudget(budget, "IN_EXECUTION", { human: t.actor.human });
  }
  if (t.to === "EXECUTED" && !(t.evidence && t.evidence.length)) throw new Error(`${c.id}: EXECUTED requires execution evidence; a report without proof is not an execution`);
  if (t.to === "MEASURED" && !(t.evidence && t.evidence.length)) throw new Error(`${c.id}: MEASURED requires a measurement record`);
  if (t.to === "CLOSED" && budget && budget.status === "IN_EXECUTION") budget = transitionBudget(budget, "CLOSED", { human: t.actor.human });
  const ev: HistoryEvent = { seq: c.history.length + 1, at: t.actor.at, by: t.actor.by, human: t.actor.human, from: c.state, to: t.to, note: t.note ?? "", evidence: t.evidence ?? [] };
  const approvedCost = t.to === "AUTHORISED" && budget ? budget.approved : c.approvedCost;
  return { contract: { ...c, state: t.to, version: c.version + 1, history: [...c.history, ev], approvedCost, budgetStatus: budget?.status ?? c.budgetStatus }, budget };
}

/** The origin must never drift: the hash of the decision-time fields must still equal originSha256. */
export function originIntact(c: InterventionContract, sha256Hex: (s: string) => string): boolean { return sha256Hex(canonical(frozenView(c))) === c.originSha256; }
