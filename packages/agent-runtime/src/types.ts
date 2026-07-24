/** Contrats du runtime d'agents. */
import type {
  AgentRunId,
  Approval,
  AutonomyTier,
  CorrelationId,
  EventId,
  EventPayloadMap,
  EventType,
  MandateId,
  RunnableAgentId,
  TickType,
} from "@anesis/core";
import type { SqlClient } from "@anesis/db";
import type { PolicyOutcome } from "@anesis/policy";

/** Intention d'action. `effect` n'est exécuté QUE si `authorize()` renvoie `allow`. */
export interface ToolIntent {
  readonly name: string;
  readonly tier: AutonomyTier;
  readonly input: unknown;
  readonly reversible?: boolean;
  readonly compensation?: string;
  /** Pour T3/T4/T5 : l'Approval qui autorise cette action (jugée par les invariants de core). */
  readonly approval?: Approval;
  /** Effet externe réel — idempotent. Retourne une valeur optionnelle (ex: id d'artefact créé). */
  effect(client: SqlClient): Promise<unknown>;
}

export type Trigger =
  | { readonly kind: "event"; readonly type: EventType; readonly payload: unknown }
  | { readonly kind: "tick"; readonly tick: TickType }
  | { readonly kind: "system"; readonly reason: string };

export interface AgentContext {
  readonly client: SqlClient;
  /** null = run purement système (ex: évaluation d'un prospect hors mandat) — restreint à T0. */
  readonly mandateId: MandateId | null;
  readonly correlationId: CorrelationId;
  readonly trigger: Trigger;
  /** Run courant (renseigné après startRun/resumeRun). */
  readonly runId: AgentRunId;
  /** Démarre l'AgentRun de cette invocation. */
  startRun(): Promise<AgentRunId>;
  /** Reprend un run existant (ex: après approbation). */
  resumeRun(runId: AgentRunId): Promise<void>;
  /** SEUL chemin d'exécution d'une action : passe par authorize() puis, si autorisé, exécute. */
  act(intent: ToolIntent): Promise<PolicyOutcome>;
  /** Émet (append) un événement de domaine dans le journal ; le drain le distribuera. Retourne son id. */
  emit<T extends EventType>(type: T, payload: EventPayloadMap[T]): Promise<EventId>;
  /** Clôt le run avec les minutes humaines (donnée produit : levier de scalabilité). */
  completeRun(humanMinutes: number, source: "measured" | "estimated"): Promise<void>;
  /** Met le run en attente d'approbation (ne le clôt pas). */
  suspendForApproval(): Promise<void>;
}

export interface Agent {
  readonly id: RunnableAgentId; // les 12 du roster OU un agent système (planner)
  readonly events?: readonly EventType[];
  readonly ticks?: readonly TickType[];
  run(ctx: AgentContext): Promise<void>;
}
