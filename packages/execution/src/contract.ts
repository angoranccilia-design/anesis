/**
 * INTERVENTION CONTRACT — what a prepared intervention is, field by field (the founder's 24 points). A field the data
 * cannot establish is null or UNKNOWN; nothing is filled with zero or a convenient guess. The contract is frozen at
 * preparation (its hash is kept); everything that happens afterwards is appended to its history, never edited in.
 */
import type { MoneyLine, BudgetStatus, InterventionStatus, FundingSource, ObservedChange } from "@anesis/engine";

/** A proof that something happened: a reference a human can go and check (ticket id, deployment url, invoice number, statement). Free text alone is not a proof. */
export interface ExecutionProof { readonly kind: "ticket" | "deployment" | "screenshot" | "invoice" | "statement" | "report" | "other"; readonly reference: string; readonly note: string; readonly recordedAt: string; readonly by: string }
/** What execution produced, appended after the fact; never part of the origin hash. */
export interface ExecutionRecord { readonly proofs: readonly ExecutionProof[]; readonly actualSpend: MoneyLine; readonly executedAt: string | null; readonly measured: ObservedChange | null }

export type EvidenceClass = "VERIFIED" | "ESTIMATED" | "HYPOTHESIS" | "UNKNOWN";
export interface EvidenceItem { readonly id: string; readonly metric: string; readonly value: number | null; readonly unit: string | null; readonly source: string; readonly cls: EvidenceClass; readonly note: string }

export type ExecutionState = "PREPARED" | "SUBMITTED" | "AUTHORISED" | "IN_EXECUTION" | "EXECUTED" | "MEASURED" | "CLOSED" | "REJECTED" | "WITHDRAWN";
export type DeliverableKind = "TECHNICAL_TICKET" | "DEVELOPER_BRIEF" | "BOOKING_JOURNEY_BRIEF" | "ADDITIONAL_ANALYSIS" | "ACQUISITION_BRIEF" | "TEST_PLAN" | "GUEST_SEQUENCE_PLAN" | "DATA_REQUEST" | "MEASUREMENT_PLAN" | "CLOSURE_DOSSIER";
export interface Deliverable { readonly kind: DeliverableKind; readonly title: string; readonly body: readonly string[]; readonly notSentNote: string }   // body: lines a human reads; nothing here is dispatched

export interface MeasurementProtocol {
  readonly problem: string; readonly hypothesis: string; readonly primaryMetric: string; readonly secondaryMetrics: readonly string[];
  readonly baseline: { readonly value: number | null; readonly unit: string | null; readonly status: EvidenceClass; readonly note: string };
  readonly missingData: readonly string[]; readonly windowWeeks: number | null; readonly confounders: readonly string[];
  readonly successRule: string | null; readonly failureRule: string | null; readonly causalLimits: string;
  readonly preregistration: { readonly planId: string; readonly version: number; readonly sha256: string } | null;
}

export interface HistoryEvent { readonly seq: number; readonly at: string; readonly by: string; readonly human: boolean; readonly from: ExecutionState | null; readonly to: ExecutionState; readonly note: string; readonly evidence: readonly string[] }

export interface InterventionContract {
  readonly id: string;                                    // 1  INT-<run>-<intervention>
  readonly propertyId: string;                            // 2
  readonly decisionPackageRef: { readonly runId: string; readonly decisionId: string; readonly interventionId: string; readonly preparedAt: string };   // 3
  readonly constraint: { readonly id: string | null; readonly name: string; readonly kind: string | null; readonly isBinding: boolean };   // 4
  readonly diagnosis: string;                             // 5  bindingWhy, as the engine wrote it
  readonly sources: readonly EvidenceItem[];              // 6
  readonly evidence: { readonly verified: readonly string[]; readonly estimated: readonly string[]; readonly hypotheses: readonly string[]; readonly unknown: readonly string[] };   // 7
  readonly priorityReason: string;                        // 8
  readonly optionsConsidered: readonly { readonly id: string; readonly name: string; readonly status: string; readonly reasons: readonly string[] }[];   // 9
  readonly invalidatingConditions: readonly string[];     // 10
  readonly objective: string;                             // 11
  readonly baseline: MeasurementProtocol["baseline"];     // 12
  readonly resultIndicator: { readonly metric: string; readonly method: string };   // 13
  readonly observationWindowWeeks: number | null;         // 14
  readonly risks: { readonly operational: string; readonly financial: string; readonly reputational: string; readonly level: string; readonly reversibility: string };   // 15
  readonly prerequisites: { readonly dependsOn: readonly string[]; readonly status: string; readonly unmet: readonly string[] };   // 16
  readonly estimatedBudget: MoneyLine;                    // 17  ESTIMATE or UNKNOWN
  readonly funding: { readonly source: FundingSource; readonly note: string };   // 17b who funds it under the contract on record; never assumed
  readonly approvedCost: MoneyLine;                       // 18  UNKNOWN until a human approves
  readonly owner: { readonly head: string; readonly capabilities: readonly string[]; readonly executionResources: readonly string[] };   // 19
  readonly actions: readonly string[];                    // 20
  readonly executionEvidenceRequired: readonly string[];  // 21
  readonly measurement: MeasurementProtocol;              // 22
  readonly confidence: { readonly value: number; readonly basis: string; readonly limits: readonly string[] };   // 23
  readonly history: readonly HistoryEvent[];              // 24
  readonly decisionStatus: InterventionStatus;            // the engine's status at preparation (FUNDED = proposed, approval required)
  readonly budgetStatus: BudgetStatus;
  readonly approvalLevel: 0 | 1 | 2 | 3 | 4;
  readonly state: ExecutionState;
  readonly version: number;
  readonly originSha256: string;                          // hash of the contract as prepared; never changes
  readonly deliverables: readonly Deliverable[];
  readonly dataRequest: { readonly missing: readonly string[]; readonly why: string; readonly decisionItWouldInform: string; readonly impossibleWithout: readonly string[] } | null;
  readonly simulated: boolean;                            // true while any cited source is simulated
  readonly execution: ExecutionRecord;
}

/** The decision-time fields: what the origin hash covers. State, version, history, approvals, budget status and deliverables live outside it. */
export function frozenView(c: Omit<InterventionContract, "originSha256" | "deliverables" | "history" | "state" | "version" | "approvedCost" | "budgetStatus" | "execution"> & Partial<InterventionContract>): Record<string, unknown> {
  const { originSha256: _o, deliverables: _d, history: _h, state: _s, version: _v, approvedCost: _a, budgetStatus: _b, execution: _e, ...frozen } = c as InterventionContract;
  return frozen;
}

/** Canonical JSON (keys sorted at every level) so a hash survives any store that reorders keys, such as Postgres jsonb. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
}
