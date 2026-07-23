/**
 * Task — unité de travail rattachée à un Objective (jamais orpheline).
 * Porte `mandateId` (dénormalisé) pour l'isolation par mandat.
 */
import type { AgentId } from "./agent.js";
import type { Iso8601, MandateId, ObjectiveId, TaskId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type TaskState = "created" | "assigned" | "in_progress" | "blocked" | "completed" | "cancelled";

export const TASK_TRANSITIONS: TransitionMap<TaskState> = {
  created: ["assigned", "cancelled"],
  assigned: ["in_progress", "blocked", "cancelled"],
  in_progress: ["completed", "blocked", "cancelled"],
  blocked: ["assigned", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

export interface Task {
  readonly id: TaskId;
  readonly objectiveId: ObjectiveId; // non nullable — pas de Task sans Objective
  readonly mandateId: MandateId; // dénormalisé pour l'isolation par mandat
  readonly assignedAgent: AgentId | null;
  readonly state: TaskState;
  readonly intent: string;
  readonly createdAt: Iso8601;
}
