/**
 * Invariants du domaine — fonctions PURES retournant un `Check`.
 * Ce sont les règles que le brief impose et que les tests d'invariants vérifient.
 */
import type { AgentRun, ToolCallRecord } from "./agent-run.js";
import { isTerminalRun } from "./agent-run.js";
import type { Approval } from "./approval.js";
import type { Artifact } from "./artifact.js";
import {
  RETENTION_WINDOW_MS,
  requiresBlockingApproval,
  requiresRetentionWindow,
  requiresReversibility,
} from "./autonomy.js";
import type { Notification } from "./notification.js";
import type { Objective } from "./objective.js";
import type { Task } from "./task.js";
import { all, fail, msBetween, ok, type Check } from "./primitives.js";

/** Présence d'une CHAÎNE non vide (restreinte aux strings : un objet ne doit jamais « passer »). */
const nonEmptyString = (v: unknown): boolean => typeof v === "string" && v.trim() !== "";

/** #2 — un Objective trace toujours vers une LossLineItem (£ chiffré). */
export const checkObjective = (o: Objective): Check =>
  nonEmptyString(o.lossLineId)
    ? ok
    : fail({ code: "OBJECTIVE_LOSS_LINE", message: "Objective doit tracer vers une LossLineItem (lossLineId)" });

/** #3 — pas de Task sans Objective ni mandat. */
export const checkTask = (t: Task): Check =>
  all(
    nonEmptyString(t.objectiveId) ? ok : fail({ code: "TASK_OBJECTIVE", message: "Task sans Objective" }),
    nonEmptyString(t.mandateId) ? ok : fail({ code: "TASK_MANDATE", message: "Task sans mandateId" }),
  );

/** #3 — pas d'Artifact sans AgentRun. */
export const checkArtifact = (a: Artifact): Check =>
  nonEmptyString(a.producedByRun) ? ok : fail({ code: "ARTIFACT_RUN", message: "Artifact sans AgentRun" });

/** #10 — une Notification a toujours une action attendue. */
export const checkNotification = (n: Notification): Check =>
  n.expectedAction.trim() !== ""
    ? ok
    : fail({ code: "NOTIFICATION_ACTION", message: "Notification sans action attendue explicite" });

/**
 * Invariants d'un tool-call :
 *  - Réversibilité (#9) : `compensation` obligatoire dès T2, et dès que `reversible` est vrai.
 *  - Fenêtre de retenue (T2) : doit avoir été observée, >= 2 h avant l'exécution.
 *  - Approbation bloquante (T3/T4/T5) : présente ET prouvée ANTÉRIEURE à l'exécution.
 */
export const checkToolCall = (tc: ToolCallRecord): Check => {
  const checks: Check[] = [];

  if (requiresReversibility(tc.tier) || tc.reversible) {
    checks.push(
      nonEmptyString(tc.compensation)
        ? ok
        : fail({ code: "TOOLCALL_COMPENSATION", message: `action ${tc.tier} doit documenter une compensation` }),
    );
  }

  if (requiresRetentionWindow(tc.tier)) {
    if (tc.retentionStartedAt === null) {
      checks.push(
        fail({ code: "TOOLCALL_RETENTION_WINDOW", message: `action ${tc.tier} exécutée sans fenêtre de retenue` }),
      );
    } else if (msBetween(tc.retentionStartedAt, tc.at) < RETENTION_WINDOW_MS) {
      checks.push(
        fail({
          code: "TOOLCALL_RETENTION_WINDOW",
          message: `action ${tc.tier} exécutée avant la fin de la fenêtre de retenue (2 h)`,
        }),
      );
    }
  }

  if (requiresBlockingApproval(tc.tier)) {
    if (tc.approvedBy === null || tc.approvedAt === null) {
      checks.push(
        fail({ code: "TOOLCALL_APPROVAL", message: `action ${tc.tier} exécutée sans approbation humaine` }),
      );
    } else if (msBetween(tc.approvedAt, tc.at) < 0) {
      checks.push(
        fail({
          code: "TOOLCALL_APPROVAL_ORDER",
          message: `action ${tc.tier} : approbation (approvedAt) postérieure à l'exécution (at)`,
        }),
      );
    }
    if (tc.approvalId === null) {
      checks.push(
        fail({ code: "TOOLCALL_APPROVAL_LINK", message: `action ${tc.tier} sans lien vers une Approval (approvalId)` }),
      );
    }
  }

  return all(...checks);
};

/**
 * Invariant CROISÉ tool-call ↔ Approval. Garantit qu'une action à approbation bloquante est
 * autorisée par une Approval précise, accordée, du bon niveau, non expirée, et dont le décideur
 * et l'horodatage correspondent exactement à ce que le tool-call déclare.
 * (L'unicité d'usage — une Approval consommée une seule fois — est garantie par une contrainte
 * d'unicité sur `tool_calls.approval_id` dans packages/db, pas ici.)
 */
export const checkToolCallAgainstApproval = (tc: ToolCallRecord, approval: Approval): Check => {
  const checks: Check[] = [];

  if (approval.status !== "granted") {
    checks.push(fail({ code: "TOOLCALL_APPROVAL_STATUS", message: `approbation non accordée (status=${approval.status})` }));
  }
  if (approval.id !== tc.approvalId) {
    checks.push(fail({ code: "TOOLCALL_APPROVAL_LINK", message: "l'Approval ne correspond pas à approvalId du tool-call" }));
  }
  if (approval.tier !== tc.tier) {
    checks.push(
      fail({ code: "TOOLCALL_APPROVAL_TIER", message: `tier divergent : approbation ${approval.tier} ≠ action ${tc.tier}` }),
    );
  }
  if (approval.decidedAt !== tc.approvedAt || approval.decidedBy !== tc.approvedBy) {
    checks.push(
      fail({ code: "TOOLCALL_APPROVAL_MISMATCH", message: "décideur/horodatage d'approbation incohérents avec le tool-call" }),
    );
  }
  if (approval.expiresAt !== null && msBetween(approval.expiresAt, tc.at) > 0) {
    checks.push(fail({ code: "TOOLCALL_APPROVAL_EXPIRED", message: "action exécutée après expiration de l'approbation" }));
  }

  return all(...checks);
};

/**
 * Invariants d'un AgentRun :
 *  - #1 : un run terminé porte humanMinutesSpent (>=0) + humanMinutesSource + endedAt ;
 *  - symétrique : un run NON terminé ne porte pas encore endedAt ;
 *  - costTokens et durationMs sont des compteurs >= 0 (données de pilotage) ;
 *  - #5/#8 : un run purement système (mandateId null) est restreint à des actions T0 ;
 *  - chaque tool-call respecte réversibilité + retenue + approbation antérieure.
 *
 * NOTE — L'arrêt d'urgence (`Mandate.emergencyStopped` / coupure globale) n'est PAS vérifié ici :
 * un AgentRun ne voit pas son Mandate. La règle « aucune action externe après arrêt d'urgence,
 * et ANNULATION (pas suspension) des T2 en retenue » est à la charge de packages/policy, avec son
 * propre test (le domaine fournit seulement la transition `sleeping_retention → cancelled`).
 */
export const checkAgentRun = (run: AgentRun): Check => {
  const checks: Check[] = [];

  checks.push(
    run.costTokens >= 0 ? ok : fail({ code: "AGENTRUN_COST_TOKENS", message: "costTokens doit être >= 0" }),
  );
  checks.push(
    run.durationMs >= 0 ? ok : fail({ code: "AGENTRUN_DURATION", message: "durationMs doit être >= 0" }),
  );

  if (isTerminalRun(run.status)) {
    checks.push(
      typeof run.humanMinutesSpent === "number" &&
        !Number.isNaN(run.humanMinutesSpent) &&
        run.humanMinutesSpent >= 0
        ? ok
        : fail({ code: "AGENTRUN_HUMAN_MINUTES", message: "humanMinutesSpent doit être un nombre >= 0 sur un run terminé" }),
    );
    checks.push(
      run.humanMinutesSource === "measured" || run.humanMinutesSource === "estimated"
        ? ok
        : fail({ code: "AGENTRUN_HUMAN_MINUTES_SOURCE", message: "humanMinutesSource obligatoire (measured|estimated)" }),
    );
    checks.push(
      run.endedAt !== null ? ok : fail({ code: "AGENTRUN_ENDED_AT", message: "endedAt requis sur un run terminé" }),
    );
  } else {
    checks.push(
      run.endedAt === null
        ? ok
        : fail({ code: "AGENTRUN_ENDED_AT_PREMATURE", message: "un run non terminé ne doit pas porter endedAt" }),
    );
  }

  if (run.mandateId === null) {
    for (const tc of run.toolCalls) {
      if (tc.tier !== "T0") {
        checks.push(
          fail({ code: "SYSTEM_RUN_TIER", message: `run système (mandateId null) limité à T0, trouvé ${tc.tier}` }),
        );
      }
    }
  }

  for (const tc of run.toolCalls) {
    checks.push(checkToolCall(tc));
  }

  return all(...checks);
};
