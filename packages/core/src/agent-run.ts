/**
 * AgentRun — UNE exécution d'un agent. Entité de première classe et la plus importante du système.
 * `humanMinutesSpent` est une donnée PRODUIT (le levier opérationnel), pas un log :
 * obligatoire, non nullable, accompagnée de `humanMinutesSource` (jamais présenter une estimation
 * comme une mesure).
 */
import type { AgentId } from "./agent.js";
import type { AutonomyTier } from "./autonomy.js";
import type { EventType, TickType } from "./event.js";
import type {
  AgentRunId,
  ApprovalId,
  ArtifactId,
  CorrelationId,
  EventId,
  Iso8601,
  MandateId,
  OperatorId,
  TaskId,
} from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type AgentRunStatus =
  | "started"
  | "awaiting_approval" // bloqué sur une approbation T3/T4/T5
  | "sleeping_retention" // en fenêtre de retenue T2
  | "completed"
  | "failed"
  | "cancelled";

export const AGENT_RUN_TRANSITIONS: TransitionMap<AgentRunStatus> = {
  started: ["awaiting_approval", "sleeping_retention", "completed", "failed", "cancelled"],
  awaiting_approval: ["started", "completed", "failed", "cancelled"],
  // L'arrêt d'urgence ANNULE (pas suspend) un run en retenue → cancelled.
  sleeping_retention: ["started", "completed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export const TERMINAL_RUN_STATUSES: readonly AgentRunStatus[] = ["completed", "failed", "cancelled"];

export const isTerminalRun = (status: AgentRunStatus): boolean => TERMINAL_RUN_STATUSES.includes(status);

/** Provenance mesurée vs estimée de `humanMinutesSpent` — principe global du système. */
export type HumanMinutesSource = "measured" | "estimated";

export type RunTrigger =
  | { readonly kind: "event"; readonly eventId: EventId; readonly eventType: EventType }
  | { readonly kind: "tick"; readonly tick: TickType }
  | { readonly kind: "task"; readonly taskId: TaskId }
  | { readonly kind: "manual"; readonly operatorId: OperatorId };

export interface ToolCallRecord {
  readonly name: string;
  readonly tier: AutonomyTier;
  readonly input: unknown;
  readonly output: unknown;
  readonly at: Iso8601; // moment de l'exécution de l'action
  // Approbation (T3/T4/T5) — doit être PROUVÉE antérieure à l'exécution ET reliée à une Approval précise.
  readonly approvalId: ApprovalId | null; // quelle Approval autorise CETTE action (unicité garantie en db)
  readonly approvedBy: OperatorId | null;
  readonly approvedAt: Iso8601 | null; // doit être <= `at`
  // Fenêtre de retenue (T2) — doit avoir été observée (>= RETENTION_WINDOW_MS avant `at`).
  readonly retentionStartedAt: Iso8601 | null;
  /**
   * Réversibilité : `true` = compensation programmatique disponible (`compensate()` implémenté) ;
   * `false` = procédure d'annulation documentée uniquement.
   * Dans les DEUX cas, `compensation` (texte) est obligatoire pour T2+ et dès que `reversible` est vrai.
   */
  readonly reversible: boolean;
  readonly compensation: string | null;
}

export interface AgentRun {
  readonly id: AgentRunId;
  readonly agentId: AgentId;
  readonly mandateId: MandateId | null; // null = run purement système (restreint à T0)
  readonly taskId: TaskId | null; // null = run non issu d'une tâche (ex: monitoring qui CRÉE des tâches)
  readonly trigger: RunTrigger;
  readonly inputs: unknown; // snapshot issu du workspace
  readonly toolCalls: readonly ToolCallRecord[];
  readonly artifacts: readonly ArtifactId[];
  readonly status: AgentRunStatus;
  readonly costTokens: number;
  readonly durationMs: number;
  readonly humanMinutesSpent: number; // ★ obligatoire, non nullable, >= 0
  readonly humanMinutesSource: HumanMinutesSource; // ★ obligatoire
  readonly correlationId: CorrelationId;
  readonly startedAt: Iso8601;
  readonly endedAt: Iso8601 | null;
}
