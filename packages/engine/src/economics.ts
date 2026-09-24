/**
 * COMMERCIAL MODEL — the three economic layers, kept apart by type.
 *
 *   Layer 1  PARTNERSHIP        pays Anesis's continuous commercial responsibility (intelligence, diagnosis, decision, governance,
 *                               orchestration of the Heads, measurement, learning). Never a spending pool.
 *   Layer 2  INTERVENTION BUDGET the economic budget an intervention needs. An ESTIMATE with assumptions, or UNKNOWN. A decision
 *                               of its own: PROPOSED → APPROVED / REJECTED → AUTHORISED. Never the partnership fee, never Anesis
 *                               revenue by itself, never a provider's price, never an authorised spend.
 *   Layer 3  EXECUTION RESOURCES the capabilities mobilised by the responsible Head (internal, contracted, partner, client team).
 *                               The client is not the project manager.
 *
 * Funding of layer 3 depends on the contract model and is never assumed: managed partnership (some execution included),
 * partnership + intervention budget, hybrid (included up to a limit), or client-funded execution with Anesis still responsible
 * for orchestration and measurement.
 *
 * Money is never one number: observed cost, estimated intervention budget, approved budget, actual spend, provider cost,
 * Anesis revenue, client-funded spend and media spend are distinct kinds, each OBSERVED, ESTIMATE or UNKNOWN.
 */
import type { Intervention, InterventionStatus } from "./model.js";

export type FundingModel = "managed_partnership" | "partnership_plus_intervention_budget" | "hybrid" | "client_funded_execution";
export const FUNDING_MODEL_LABEL: Record<FundingModel, string> = {
  managed_partnership: "Model A — Managed partnership: some execution capabilities included",
  partnership_plus_intervention_budget: "Model B — Partnership + intervention budget: the partnership covers Anesis and orchestration; interventions are budgeted separately",
  hybrid: "Model C — Hybrid: interventions included up to a defined limit, separate budget beyond",
  client_funded_execution: "Model D — Client-funded execution: the client funds providers directly; Anesis remains responsible for orchestration and measurement",
};

export type Capability = "ux" | "cro" | "development" | "booking_engine" | "paid_media" | "seo" | "crm" | "revenue_management" | "content" | "photography" | "video" | "operations" | "technology" | "data" | "partnerships" | "brand";

export type Head = "strategy_commercial_intelligence" | "brand_acquisition" | "digital_experience_booking" | "revenue_conversion_economics" | "guest_lifecycle_experience";
export const HEAD_TITLE: Record<Head, string> = {
  strategy_commercial_intelligence: "Head of Strategy & Commercial Intelligence",
  brand_acquisition: "Head of Brand & Acquisition",
  digital_experience_booking: "Head of Digital Experience & Booking",
  revenue_conversion_economics: "Head of Revenue & Conversion Economics",
  guest_lifecycle_experience: "Head of Guest Lifecycle & Experience",
};
/** Which Head owns an intervention's factor, and which capabilities that Head typically mobilises (declared). */
export const HEAD_FOR_FACTOR: Record<string, { head: Head; capabilities: Capability[] }> = {
  conversion: { head: "digital_experience_booking", capabilities: ["ux", "cro", "development", "booking_engine"] },
  demand: { head: "brand_acquisition", capabilities: ["paid_media", "content", "brand"] },
  offpeak_demand: { head: "brand_acquisition", capabilities: ["paid_media", "content", "crm", "revenue_management"] },
  direct_capture: { head: "revenue_conversion_economics", capabilities: ["revenue_management", "booking_engine", "cro"] },
  retention: { head: "guest_lifecycle_experience", capabilities: ["crm", "content", "data"] },
};

export type MoneyKind = "observed_cost" | "estimated_intervention_budget" | "approved_budget" | "actual_spend" | "provider_cost" | "anesis_revenue" | "client_funded_spend" | "media_spend";
export type MoneyStatus = "OBSERVED" | "ESTIMATE" | "UNKNOWN";
export interface MoneyLine { readonly kind: MoneyKind; readonly amountGbp: number | null; readonly status: MoneyStatus; readonly assumptions: readonly string[]; readonly source: string }
export const unknown = (kind: MoneyKind, why: string): MoneyLine => ({ kind, amountGbp: null, status: "UNKNOWN", assumptions: [why], source: "none" });

export interface PartnershipTerms {
  readonly monthlyFeeGbp: number | null;          // Anesis revenue for its responsibility; null = UNKNOWN (not yet contracted)
  readonly fundingModel: FundingModel | null;     // null = requires contract determination
  readonly includedCapabilities: readonly Capability[];
  readonly hybridIncludedLimitGbp: number | null;
  readonly source: string;
}
export const NO_TERMS: PartnershipTerms = { monthlyFeeGbp: null, fundingModel: null, includedCapabilities: [], hybridIncludedLimitGbp: null, source: "no contract on record" };

export type BudgetStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "AUTHORISED" | "IN_EXECUTION" | "CLOSED";
export type FundingSource = "included_in_partnership" | "separate_intervention_budget" | "partly_included_partly_separate" | "client_funded" | "requires_contract_determination";

export interface InterventionBudget {
  readonly interventionId: string;
  readonly estimated: MoneyLine;                 // estimated_intervention_budget (ESTIMATE) — never the partnership fee, never a provider's price
  readonly approved: MoneyLine;                  // approved_budget — UNKNOWN until a human approves
  readonly actualSpend: MoneyLine;               // actual_spend — UNKNOWN until execution reports it
  readonly providerCost: MoneyLine;              // provider_cost — UNKNOWN until quoted
  readonly anesisRevenue: MoneyLine;             // anesis_revenue — the partnership fee is separate; an intervention is revenue only if the contract says so
  readonly status: BudgetStatus;
  readonly approvalRequired: boolean;
  readonly approvalLevel: 0 | 1 | 2 | 3 | 4;
  readonly fundingSource: FundingSource;
  readonly fundingNote: string;
  readonly partnershipSeparate: true;            // the partnership is always a separate line from an intervention budget
}

export interface DecisionPackage {
  readonly interventionId: string;
  readonly commercialConstraint: string;
  readonly decision: string;
  readonly estimatedInterventionBudget: MoneyLine;
  readonly partnership: "Separate";
  readonly fundingModel: string;
  readonly responsibleAnesisFunction: string;    // Head title
  readonly requiredCapabilities: readonly Capability[];
  readonly executionResources: readonly string[]; // providers / internal / client team already known; may be empty
  readonly clientRole: string;
  readonly anesisRole: string;
  readonly execution: string;
  readonly measurement: string;
  readonly outcome: string;
  readonly learning: string;
  readonly budgetStatus: BudgetStatus;
  readonly approval: string;
}

/** Declared: the funding source of an intervention under each contract model. Never assumes included or excluded without a model. */
export function fundingSource(terms: PartnershipTerms, caps: readonly Capability[], estimateGbp: number | null): { source: FundingSource; note: string } {
  if (!terms.fundingModel) return { source: "requires_contract_determination", note: "no contract model on record: whether this budget is included in the partnership or billed separately is a contractual decision, not an assumption" };
  const covered = caps.filter((c) => terms.includedCapabilities.includes(c));
  switch (terms.fundingModel) {
    case "managed_partnership": return covered.length === caps.length && caps.length > 0 ? { source: "included_in_partnership", note: `all required capabilities (${caps.join(", ")}) are included in the managed partnership` } : covered.length ? { source: "partly_included_partly_separate", note: `${covered.join(", ")} included; ${caps.filter((c) => !covered.includes(c)).join(", ")} require a separate budget` } : { source: "separate_intervention_budget", note: "none of the required capabilities is included in the partnership" };
    case "partnership_plus_intervention_budget": return { source: "separate_intervention_budget", note: "the partnership covers Anesis and orchestration; this intervention is budgeted separately" };
    case "hybrid": return estimateGbp !== null && terms.hybridIncludedLimitGbp !== null && estimateGbp <= terms.hybridIncludedLimitGbp ? { source: "included_in_partnership", note: `estimate £${estimateGbp.toLocaleString("en-GB")} within the included limit £${terms.hybridIncludedLimitGbp.toLocaleString("en-GB")}` } : { source: "separate_intervention_budget", note: `estimate ${estimateGbp === null ? "unknown" : "£" + estimateGbp.toLocaleString("en-GB")} exceeds or cannot be compared to the included limit ${terms.hybridIncludedLimitGbp === null ? "(unknown)" : "£" + terms.hybridIncludedLimitGbp.toLocaleString("en-GB")}` };
    case "client_funded_execution": return { source: "client_funded", note: "the client funds execution directly; Anesis remains responsible for orchestration and measurement" };
  }
}

export function interventionBudget(i: Intervention, status: InterventionStatus, terms: PartnershipTerms, level: 0 | 1 | 2 | 3 | 4): InterventionBudget {
  const caps = HEAD_FOR_FACTOR[i.actsOn]?.capabilities ?? [];
  const estimated: MoneyLine = { kind: "estimated_intervention_budget", amountGbp: i.costGbp, status: "ESTIMATE", assumptions: ["declared engine estimate of the economic budget the intervention needs; not a provider quote, not the partnership fee, not an authorised spend"], source: "engine (declared)" };
  const f = fundingSource(terms, caps, i.costGbp);
  return {
    interventionId: i.id, estimated,
    approved: unknown("approved_budget", "no approval recorded"), actualSpend: unknown("actual_spend", "execution has not started"), providerCost: unknown("provider_cost", "no quote on record"),
    anesisRevenue: terms.fundingModel === "partnership_plus_intervention_budget" || f.source === "separate_intervention_budget" ? unknown("anesis_revenue", "an intervention billed separately is revenue only per the contract's terms; not derived from the estimate") : unknown("anesis_revenue", "the partnership fee is a separate line; nothing here is Anesis revenue by itself"),
    status: status === "FUNDED" ? "PROPOSED" : status === "INVESTIGATE" ? "PROPOSED" : "REJECTED", approvalRequired: true, approvalLevel: level, fundingSource: f.source, fundingNote: f.note, partnershipSeparate: true,
  };
}

export function decisionPackage(i: Intervention, constraintName: string, status: InterventionStatus, budget: InterventionBudget, terms: PartnershipTerms, resources: readonly string[], measurement: string): DecisionPackage {
  const h = HEAD_FOR_FACTOR[i.actsOn];
  return {
    interventionId: i.id, commercialConstraint: constraintName,
    decision: status === "FUNDED" ? `Prioritise: ${i.name}` : status === "INVESTIGATE" ? `Investigate before committing: ${i.name} (${i.informationOption?.name ?? "information purchase"})` : `Do not start now: ${i.name}`,
    estimatedInterventionBudget: budget.estimated, partnership: "Separate",
    fundingModel: terms.fundingModel ? `${FUNDING_MODEL_LABEL[terms.fundingModel]} → ${budget.fundingNote}` : "Requires contract determination",
    responsibleAnesisFunction: h ? HEAD_TITLE[h.head] : "Founder & CEO",
    requiredCapabilities: h?.capabilities ?? [],
    executionResources: resources,
    clientRole: "Approve intervention / constraints / budget; refuse; adjust; ask for explanations; provide resources; take decisions that are legally or strategically theirs",
    anesisRole: "Own the decision, orchestration, governance and measurement; the client is not the project manager",
    execution: status === "FUNDED" ? "Mobilised by the responsible Head after approval" : status === "INVESTIGATE" ? "Information purchase first; execution not mobilised" : "Not mobilised",
    measurement, outcome: "Recorded against the pre-registered plan", learning: "Returned to Anesis Memory (forecast error, calibration, provider evidence)",
    budgetStatus: budget.status, approval: budget.approvalRequired ? `REQUIRED — governance level L${budget.approvalLevel}; a recommendation is never an authorised spend` : "not required",
  };
}

/** Budget lifecycle: PROPOSED → APPROVED | REJECTED → AUTHORISED → IN_EXECUTION → CLOSED. Only humans move it past PROPOSED. */
export function transitionBudget(b: InterventionBudget, to: BudgetStatus, by: { human: boolean; amountGbp?: number }): InterventionBudget {
  const allowed: Record<BudgetStatus, BudgetStatus[]> = { PROPOSED: ["APPROVED", "REJECTED"], APPROVED: ["AUTHORISED", "REJECTED"], REJECTED: [], AUTHORISED: ["IN_EXECUTION"], IN_EXECUTION: ["CLOSED"], CLOSED: [] };
  if (!allowed[b.status].includes(to)) throw new Error(`budget ${b.interventionId}: ${b.status} → ${to} is not allowed`);
  if (!by.human && (to === "APPROVED" || to === "AUTHORISED")) throw new Error(`budget ${b.interventionId}: ${to} requires a human decision (L${b.approvalLevel}); the engine cannot approve its own recommendation`);
  const approved = to === "APPROVED" ? { kind: "approved_budget" as const, amountGbp: by.amountGbp ?? b.estimated.amountGbp, status: "OBSERVED" as const, assumptions: [], source: "human approval" } : b.approved;
  return { ...b, status: to, approved };
}
