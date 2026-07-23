/**
 * Schéma Drizzle ANESIS — miroir typé des migrations SQL (`migrations/0000_init.sql`).
 * Les migrations SQL restent la source appliquée (elles portent aussi la RLS et l'append-only,
 * que Drizzle ne génère pas). Ce fichier fournit l'accès typé aux mêmes tables.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const propertyState = pgEnum("property_state", [
  "prospect",
  "assessed",
  "qualified",
  "underwriting",
  "mandate",
  "completed",
  "declined",
  "dormant",
]);
export const mandateState = pgEnum("mandate_state", ["active", "suspended", "completed", "terminated"]);
export const objectiveState = pgEnum("objective_state", ["created", "active", "at_risk", "achieved", "abandoned"]);
export const taskState = pgEnum("task_state", ["created", "assigned", "in_progress", "blocked", "completed", "cancelled"]);
export const agentRunStatus = pgEnum("agent_run_status", [
  "started",
  "awaiting_approval",
  "sleeping_retention",
  "completed",
  "failed",
  "cancelled",
]);
export const artifactState = pgEnum("artifact_state", ["produced", "approved", "rejected"]);
export const blockerState = pgEnum("blocker_state", ["raised", "resolved"]);
export const approvalStatus = pgEnum("approval_status", ["pending", "granted", "denied", "expired"]);
export const autonomyTier = pgEnum("autonomy_tier", ["T0", "T1", "T2", "T3", "T4", "T5"]);
export const humanMinutesSource = pgEnum("human_minutes_source", ["measured", "estimated"]);
export const notificationPriority = pgEnum("notification_priority", ["low", "normal", "high", "urgent"]);
export const operatorRole = pgEnum("operator_role", ["founder", "operator"]);

export const operators = pgTable("operators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: operatorRole("role").notNull(),
});

export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    state: propertyState("state").notNull().default("prospect"),
    city: text("city"),
    county: text("county"),
    region: text("region").notNull(),
    website: text("website"),
    websiteDomain: text("website_domain"),
    source: text("source").notNull(),
    priority: integer("priority").notNull().default(0),
    keys: integer("keys"),
    avgNightlyRatePence: bigint("avg_nightly_rate_pence", { mode: "number" }),
    otaSharePct: numeric("ota_share_pct"),
    hasInHouseMarketing: boolean("has_in_house_marketing"),
    contacts: jsonb("contacts").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("properties_website_domain_uidx").on(t.websiteDomain)],
);

export const mandates = pgTable("mandates", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id").notNull(),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id),
  state: mandateState("state").notNull().default("active"),
  thesisId: text("thesis_id"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  brandConstraints: jsonb("brand_constraints").notNull().default({}),
  emergencyStopped: boolean("emergency_stopped").notNull().default(false),
});

export const theses = pgTable("theses", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  leakIndex: numeric("leak_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lossLines = pgTable("loss_lines", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  thesisId: text("thesis_id")
    .notNull()
    .references(() => theses.id),
  pillar: text("pillar").notNull(),
  annualLossPence: bigint("annual_loss_pence", { mode: "number" }).notNull(),
  rootCause: text("root_cause").notNull(),
});

export const objectives = pgTable("objectives", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  lossLineId: text("loss_line_id")
    .notNull()
    .references(() => lossLines.id),
  title: text("title").notNull(),
  targetRecoveryPence: bigint("target_recovery_pence", { mode: "number" }).notNull(),
  state: objectiveState("state").notNull().default("created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  objectiveId: text("objective_id")
    .notNull()
    .references(() => objectives.id),
  assignedAgent: text("assigned_agent"),
  state: taskState("state").notNull().default("created"),
  intent: text("intent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  mandateId: text("mandate_id").references(() => mandates.id),
  taskId: text("task_id").references(() => tasks.id),
  trigger: jsonb("trigger").notNull(),
  inputs: jsonb("inputs").notNull().default({}),
  status: agentRunStatus("status").notNull(),
  costTokens: integer("cost_tokens").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  humanMinutesSpent: integer("human_minutes_spent").notNull(),
  humanMinutesSource: humanMinutesSource("human_minutes_source").notNull(),
  correlationId: text("correlation_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  runId: text("run_id")
    .notNull()
    .references(() => agentRuns.id),
  toolCallName: text("tool_call_name").notNull(),
  tier: autonomyTier("tier").notNull(),
  reason: text("reason").notNull(),
  payload: jsonb("payload").notNull().default({}),
  amountPence: bigint("amount_pence", { mode: "number" }),
  status: approvalStatus("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  decidedBy: text("decided_by").references(() => operators.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const toolCalls = pgTable(
  "tool_calls",
  {
    id: text("id").primaryKey(),
    mandateId: text("mandate_id").references(() => mandates.id),
    runId: text("run_id")
      .notNull()
      .references(() => agentRuns.id),
    name: text("name").notNull(),
    tier: autonomyTier("tier").notNull(),
    input: jsonb("input").notNull().default({}),
    output: jsonb("output").notNull().default({}),
    at: timestamp("at", { withTimezone: true }).notNull(),
    approvalId: text("approval_id").references(() => approvals.id),
    approvedBy: text("approved_by").references(() => operators.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    retentionStartedAt: timestamp("retention_started_at", { withTimezone: true }),
    reversible: boolean("reversible").notNull().default(false),
    compensation: text("compensation"),
  },
  (t) => [uniqueIndex("tool_calls_approval_id_uidx").on(t.approvalId)],
);

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  producedByRun: text("produced_by_run")
    .notNull()
    .references(() => agentRuns.id),
  type: text("type").notNull(),
  version: integer("version").notNull().default(1),
  supersedes: text("supersedes"),
  payload: jsonb("payload").notNull().default({}),
  state: artifactState("state").notNull().default("produced"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockers = pgTable("blockers", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id").references(() => mandates.id),
  raisedByRun: text("raised_by_run")
    .notNull()
    .references(() => agentRuns.id),
  assignee: jsonb("assignee").notNull(),
  reason: text("reason").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  state: blockerState("state").notNull().default("raised"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const measurements = pgTable("measurements", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => mandates.id),
  objectiveId: text("objective_id").references(() => objectives.id),
  metric: text("metric").notNull(),
  period: text("period").notNull(),
  planned: numeric("planned").notNull(),
  actual: numeric("actual").notNull(),
  deviationPct: numeric("deviation_pct").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    mandateId: text("mandate_id"),
    emittedBy: text("emitted_by").notNull(),
    emittedAt: timestamp("emitted_at", { withTimezone: true }).notNull().defaultNow(),
    audience: jsonb("audience").notNull(),
    correlationId: text("correlation_id").notNull(),
  },
  (t) => [
    index("events_mandate_emitted_idx").on(t.mandateId, t.emittedAt),
    index("events_correlation_idx").on(t.correlationId),
    index("events_type_idx").on(t.type),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id),
    leakIndex: integer("leak_index").notNull(),
    monthlyLossPence: bigint("monthly_loss_pence", { mode: "number" }).notNull(),
    decision: text("decision").notNull(),
    decisionCode: text("decision_code").notNull(),
    icp: jsonb("icp").notNull().default({}),
    subScores: jsonb("sub_scores").notNull().default({}),
    assessedAt: timestamp("assessed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assessments_property_idx").on(t.propertyId)],
);

export const processedEvents = pgTable(
  "processed_events",
  {
    eventId: text("event_id").notNull(),
    subscriber: text("subscriber").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.subscriber] })],
);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  mandateId: text("mandate_id"),
  recipient: jsonb("recipient").notNull(),
  what: text("what").notNull(),
  why: text("why").notNull(),
  expectedAction: text("expected_action").notNull(),
  deadline: timestamp("deadline", { withTimezone: true }),
  contextLink: text("context_link").notNull(),
  priority: notificationPriority("priority").notNull().default("normal"),
  readAt: timestamp("read_at", { withTimezone: true }),
  actedAt: timestamp("acted_at", { withTimezone: true }),
});
