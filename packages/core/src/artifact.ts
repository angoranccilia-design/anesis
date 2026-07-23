/**
 * Artifact — production typée et versionnée issue d'un AgentRun (jamais orpheline).
 */
import type { AgentRunId, ArtifactId, Iso8601, MandateId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type ArtifactState = "produced" | "approved" | "rejected";

export const ARTIFACT_TRANSITIONS: TransitionMap<ArtifactState> = {
  produced: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export interface Artifact {
  readonly id: ArtifactId;
  readonly producedByRun: AgentRunId; // non nullable — pas d'Artifact sans AgentRun
  readonly mandateId: MandateId;
  readonly type: string; // "content_piece" | "campaign_plan" | "nurture_sequence" | "weekly_report" ...
  readonly version: number;
  readonly supersedes: ArtifactId | null;
  readonly payload: unknown; // typé par `type` à l'étape 4
  readonly state: ArtifactState;
  readonly createdAt: Iso8601;
}
