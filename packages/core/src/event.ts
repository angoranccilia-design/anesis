/**
 * Taxonomie d'événements typée.
 * Un Event est un FAIT IMMUABLE. La table `events` (packages/db) est append-only :
 * elle est à la fois la source de vérité, le bus, et le journal d'audit.
 * Le `correlationId` relie une chaîne de bout en bout ; tout événement est rejouable.
 */
import type {
  AgentRunId,
  ApprovalId,
  ArtifactId,
  BlockerId,
  CorrelationId,
  EventId,
  Iso8601,
  LossLineId,
  MandateId,
  MeasurementId,
  Money,
  ObjectiveId,
  OperatorId,
  PropertyId,
  TaskId,
  ThesisId,
} from "./primitives.js";
import type { AgentId } from "./agent.js";
import type { AutonomyTier } from "./autonomy.js";

export type EventType =
  | "property.assessed"
  | "property.qualified"
  | "property.declined"
  | "property.needs_review"
  | "mandate.created"
  | "mandate.thesis_attached"
  | "objective.created"
  | "objective.at_risk"
  | "objective.achieved"
  | "task.created"
  | "task.assigned"
  | "task.blocked"
  | "task.completed"
  | "agentrun.started"
  | "agentrun.completed"
  | "agentrun.failed"
  | "agentrun.cancelled"
  | "agentrun.needs_approval"
  | "artifact.produced"
  | "artifact.approved"
  | "artifact.rejected"
  | "measurement.recorded"
  | "measurement.deviation_detected"
  | "external.review_received"
  | "external.rate_parity_broken"
  | "external.ad_spend_anomaly"
  | "human.approval_requested"
  | "human.approval_granted"
  | "human.approval_denied"
  | "blocker.raised"
  | "blocker.resolved"
  | "mandate.emergency_stopped"
  | "mandate.emergency_cleared"
  | "system.emergency_stopped"
  | "system.emergency_cleared";

export const EVENT_TYPES: readonly EventType[] = [
  "property.assessed",
  "property.qualified",
  "property.declined",
  "property.needs_review",
  "mandate.created",
  "mandate.thesis_attached",
  "objective.created",
  "objective.at_risk",
  "objective.achieved",
  "task.created",
  "task.assigned",
  "task.blocked",
  "task.completed",
  "agentrun.started",
  "agentrun.completed",
  "agentrun.failed",
  "agentrun.cancelled",
  "agentrun.needs_approval",
  "artifact.produced",
  "artifact.approved",
  "artifact.rejected",
  "measurement.recorded",
  "measurement.deviation_detected",
  "external.review_received",
  "external.rate_parity_broken",
  "external.ad_spend_anomaly",
  "human.approval_requested",
  "human.approval_granted",
  "human.approval_denied",
  "blocker.raised",
  "blocker.resolved",
  "mandate.emergency_stopped",
  "mandate.emergency_cleared",
  "system.emergency_stopped",
  "system.emergency_cleared",
];

/** Battements de cœur planifiés. */
export type TickType = "hourly.tick" | "daily.tick" | "weekly.tick" | "monthly.tick";

export const TICK_TYPES: readonly TickType[] = ["hourly.tick", "daily.tick", "weekly.tick", "monthly.tick"];

export interface EventPayloadMap {
  "property.assessed": { propertyId: PropertyId; leakIndex: number };
  "property.qualified": { propertyId: PropertyId; monthlyLoss: Money };
  "property.declined": { propertyId: PropertyId; reasonCode: string };
  "property.needs_review": { propertyId: PropertyId; reasonCode: string };
  "mandate.created": { mandateId: MandateId; propertyId: PropertyId };
  "mandate.thesis_attached": { mandateId: MandateId; thesisId: ThesisId; leakIndex: number };
  "objective.created": { objectiveId: ObjectiveId; lossLineId: LossLineId; targetRecovery: Money };
  "objective.at_risk": { objectiveId: ObjectiveId; reason: string };
  "objective.achieved": { objectiveId: ObjectiveId };
  "task.created": { taskId: TaskId; objectiveId: ObjectiveId };
  "task.assigned": { taskId: TaskId; agentId: AgentId };
  "task.blocked": { taskId: TaskId; blockerId: BlockerId };
  "task.completed": { taskId: TaskId; runId: AgentRunId };
  "agentrun.started": { runId: AgentRunId; agentId: AgentId };
  "agentrun.completed": { runId: AgentRunId; humanMinutesSpent: number; costTokens: number };
  "agentrun.failed": { runId: AgentRunId; error: string };
  "agentrun.cancelled": { runId: AgentRunId; reason: string };
  "agentrun.needs_approval": { runId: AgentRunId; approvalId: ApprovalId; tier: AutonomyTier };
  "artifact.produced": { artifactId: ArtifactId; runId: AgentRunId; type: string };
  "artifact.approved": { artifactId: ArtifactId; by: OperatorId };
  "artifact.rejected": { artifactId: ArtifactId; by: OperatorId; reason: string };
  "measurement.recorded": { measurementId: MeasurementId; metric: string; actual: number };
  "measurement.deviation_detected": { measurementId: MeasurementId; metric: string; deviationPct: number };
  "external.review_received": { mandateId: MandateId; source: string; rating: number };
  "external.rate_parity_broken": { mandateId: MandateId; channel: string; delta: Money };
  "external.ad_spend_anomaly": { mandateId: MandateId; channel: string; spend: Money; expected: Money };
  "human.approval_requested": { approvalId: ApprovalId; runId: AgentRunId; amount: Money | null };
  "human.approval_granted": { approvalId: ApprovalId; by: OperatorId };
  "human.approval_denied": { approvalId: ApprovalId; by: OperatorId; reason: string };
  "blocker.raised": { blockerId: BlockerId; assignee: string; dueAt: Iso8601 };
  "blocker.resolved": { blockerId: BlockerId };
  "mandate.emergency_stopped": { mandateId: MandateId; by: OperatorId };
  "mandate.emergency_cleared": { mandateId: MandateId; by: OperatorId };
  "system.emergency_stopped": { by: OperatorId };
  "system.emergency_cleared": { by: OperatorId };
}

export interface EventAudience {
  readonly agents: readonly AgentId[];
  readonly humans: readonly OperatorId[];
  readonly roles: readonly string[];
}

/** Fait immuable survenu dans le système. */
export interface DomainEvent<T extends EventType = EventType> {
  readonly id: EventId;
  readonly type: T;
  readonly payload: EventPayloadMap[T];
  readonly mandateId: MandateId | null;
  readonly emittedBy: AgentId | OperatorId | "system";
  readonly emittedAt: Iso8601;
  readonly audience: EventAudience;
  readonly correlationId: CorrelationId;
}
