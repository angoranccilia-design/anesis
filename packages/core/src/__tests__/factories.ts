/** Fabriques de test — objets valides par défaut, surchargeables champ par champ. */
import { asId } from "../unsafe.js";
import { iso } from "../primitives.js";
import type {
  AgentRunId,
  ApprovalId,
  ArtifactId,
  EventId,
  LossLineId,
  MandateId,
  NotificationId,
  ObjectiveId,
  OperatorId,
  PropertyId,
  TaskId,
} from "../primitives.js";
import type { AgentRun, ToolCallRecord } from "../agent-run.js";
import type { Approval } from "../approval.js";
import type { Artifact } from "../artifact.js";
import type { Notification } from "../notification.js";
import type { Objective } from "../objective.js";
import type { Operator } from "../operator.js";
import type { Task } from "../task.js";
import { gbp } from "../primitives.js";

export const anOperator = (o: Partial<Operator> = {}): Operator => ({
  id: asId<OperatorId>("op-cecilia"),
  name: "Cecilia",
  email: "cecilia@anesis.co.uk",
  role: "founder",
  ...o,
});

export const aToolCall = (tc: Partial<ToolCallRecord> = {}): ToolCallRecord => ({
  name: "noop",
  tier: "T0",
  input: {},
  output: {},
  at: iso(),
  approvalId: null,
  approvedBy: null,
  approvedAt: null,
  retentionStartedAt: null,
  reversible: false,
  compensation: null,
  ...tc,
});

export const anApproval = (a: Partial<Approval> = {}): Approval => ({
  id: asId<ApprovalId>("approval-1"),
  runId: asId<AgentRunId>("run-1"),
  toolCallName: "redeploy_budget",
  tier: "T4",
  mandateId: asId<MandateId>("mandate-1"),
  reason: "Direct bookings 18% below plan",
  payload: {},
  amount: gbp(400_000),
  status: "granted",
  requestedAt: iso(),
  expiresAt: null,
  decidedBy: asId<OperatorId>("op-cecilia"),
  decidedAt: iso(),
  ...a,
});

export const aRun = (r: Partial<AgentRun> = {}): AgentRun => ({
  id: asId<AgentRunId>("run-1"),
  agentId: "analyst",
  mandateId: asId<MandateId>("mandate-1"),
  taskId: null,
  trigger: { kind: "tick", tick: "daily.tick" },
  inputs: {},
  toolCalls: [],
  artifacts: [],
  status: "completed",
  costTokens: 0,
  durationMs: 0,
  humanMinutesSpent: 0,
  humanMinutesSource: "measured",
  correlationId: asId("corr-1"),
  startedAt: iso(),
  endedAt: iso(),
  ...r,
});

export const anObjective = (o: Partial<Objective> = {}): Objective => ({
  id: asId<ObjectiveId>("obj-1"),
  mandateId: asId<MandateId>("mandate-1"),
  lossLineId: asId<LossLineId>("loss-1"),
  title: "Recover direct bookings",
  targetRecovery: gbp(1_700_000),
  state: "created",
  createdAt: iso(),
  ...o,
});

export const aTask = (t: Partial<Task> = {}): Task => ({
  id: asId<TaskId>("task-1"),
  objectiveId: asId<ObjectiveId>("obj-1"),
  mandateId: asId<MandateId>("mandate-1"),
  assignedAgent: null,
  state: "created",
  intent: "Redeploy paid budget",
  createdAt: iso(),
  ...t,
});

export const anArtifact = (a: Partial<Artifact> = {}): Artifact => ({
  id: asId<ArtifactId>("art-1"),
  producedByRun: asId<AgentRunId>("run-1"),
  mandateId: asId<MandateId>("mandate-1"),
  type: "weekly_report",
  version: 1,
  supersedes: null,
  payload: {},
  state: "produced",
  createdAt: iso(),
  ...a,
});

export const aNotification = (n: Partial<Notification> = {}): Notification => ({
  id: asId<NotificationId>("notif-1"),
  eventId: asId<EventId>("evt-1"),
  recipient: { kind: "human", id: asId<OperatorId>("op-cecilia") },
  what: "Budget redeployment awaiting your approval",
  why: "Direct bookings 18% below plan",
  expectedAction: "Approve or deny the £4,000 redeployment",
  deadline: null,
  contextLink: "/mandates/1/approvals/approval-1",
  priority: "high",
  readAt: null,
  actedAt: null,
  ...n,
});

export const anApprovalId = (): ApprovalId => asId<ApprovalId>("approval-1");
