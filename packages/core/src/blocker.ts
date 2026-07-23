/**
 * Blocker — escalade NOMINATIVE avec échéance. Levé par un agent quand une information
 * manque dans le workspace (jamais de brief rédigé à la main).
 */
import type { AgentId } from "./agent.js";
import type { AgentRunId, BlockerId, Iso8601, MandateId, OperatorId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type BlockerState = "raised" | "resolved";

export const BLOCKER_TRANSITIONS: TransitionMap<BlockerState> = {
  raised: ["resolved"],
  resolved: [],
};

export type BlockerAssignee =
  | { readonly kind: "agent"; readonly id: AgentId }
  | { readonly kind: "human"; readonly id: OperatorId };

export interface Blocker {
  readonly id: BlockerId;
  readonly raisedByRun: AgentRunId;
  readonly mandateId: MandateId | null;
  readonly assignee: BlockerAssignee; // escalade nominative
  readonly reason: string;
  readonly dueAt: Iso8601; // échéance
  readonly state: BlockerState;
  readonly resolvedAt: Iso8601 | null;
}
