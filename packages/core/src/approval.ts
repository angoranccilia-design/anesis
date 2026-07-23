/**
 * Approval — demande et décision humaine pour une action à approbation bloquante (T3/T4/T5).
 */
import type { AutonomyTier } from "./autonomy.js";
import type { AgentRunId, ApprovalId, Iso8601, MandateId, Money, OperatorId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type ApprovalStatus = "pending" | "granted" | "denied" | "expired";

export const APPROVAL_TRANSITIONS: TransitionMap<ApprovalStatus> = {
  pending: ["granted", "denied", "expired"],
  granted: [],
  denied: [],
  expired: [],
};

export interface Approval {
  readonly id: ApprovalId;
  readonly runId: AgentRunId;
  readonly toolCallName: string;
  readonly tier: AutonomyTier; // T3/T4/T5
  readonly mandateId: MandateId;
  readonly reason: string;
  readonly payload: unknown;
  readonly amount: Money | null; // renseigné pour T4 (argent/prix)
  readonly status: ApprovalStatus;
  readonly requestedAt: Iso8601;
  readonly expiresAt: Iso8601 | null;
  readonly decidedBy: OperatorId | null;
  readonly decidedAt: Iso8601 | null;
}
