/**
 * Moteur de politique d'autonomie T0→T5.
 *
 * `authorize()` DÉCIDE si une action peut procéder, et sous quel régime. Il NE réimplémente PAS les
 * invariants du domaine : la validité d'une approbation (statut granted, tier correspondant, non
 * expirée, décideur/horodatage cohérents) et la forme du tool-call (compensation, lien Approval,
 * approbation antérieure) sont déléguées à `@anesis/core` (`checkToolCall`, `checkToolCallAgainstApproval`).
 *
 * Règle d'or : l'ARRÊT D'URGENCE (global ou par mandat) prime sur TOUT — même sur une approbation
 * par ailleurs valide. Il est évalué en premier.
 */
import {
  RETENTION_WINDOW_MS,
  all,
  checkToolCall,
  checkToolCallAgainstApproval,
  requiresBlockingApproval,
  requiresRetentionWindow,
  type Approval,
  type AutonomyTier,
  type ToolCallRecord,
} from "@anesis/core";

export type PolicyOutcome =
  | { readonly kind: "allow" } // procède immédiatement
  | { readonly kind: "retain"; readonly windowMs: number } // T2 : doit passer par la fenêtre de retenue
  | { readonly kind: "require_approval"; readonly tier: AutonomyTier } // T3/T4/T5 : approbation manquante
  | { readonly kind: "deny"; readonly code: string; readonly reason: string };

export interface AuthorizeContext {
  /** Coupure d'urgence globale. */
  readonly globalStop: boolean;
  /** Coupure d'urgence du mandat concerné. */
  readonly mandateStopped: boolean;
  /** L'Approval reliée à l'action (T3/T4/T5), si elle existe déjà. */
  readonly approval?: Approval | null;
  /** Pour T2 : la fenêtre de retenue de 2 h est-elle écoulée ? (le sleep réel est au runtime) */
  readonly retentionElapsed?: boolean;
}

export function authorize(intent: ToolCallRecord, ctx: AuthorizeContext): PolicyOutcome {
  // 1. Arrêt d'urgence — priorité absolue, avant même de regarder une approbation valide.
  if (ctx.globalStop || ctx.mandateStopped) {
    return {
      kind: "deny",
      code: "EMERGENCY_STOP",
      reason: ctx.globalStop ? "système en arrêt d'urgence" : "mandat en arrêt d'urgence",
    };
  }

  const tier = intent.tier;

  // 2. T0 (interne) / T1 (externe réversible) : exécution immédiate.
  if (!requiresRetentionWindow(tier) && !requiresBlockingApproval(tier)) {
    return { kind: "allow" };
  }

  // 3. T2 : fenêtre de retenue. Autorisé, mais doit passer par la fenêtre (sauf si déjà écoulée).
  if (requiresRetentionWindow(tier)) {
    return ctx.retentionElapsed ? { kind: "allow" } : { kind: "retain", windowMs: RETENTION_WINDOW_MS };
  }

  // 4. T3/T4/T5 : approbation bloquante. Sans Approval reliée → il faut la demander.
  if (!intent.approvalId || !ctx.approval) {
    return { kind: "require_approval", tier };
  }

  // 5. Approbation présente → sa validité est jugée par les invariants de core (pas de duplication).
  const verdict = all(checkToolCall(intent), checkToolCallAgainstApproval(intent, ctx.approval));
  if (!verdict.ok) {
    const first = verdict.violations[0];
    return { kind: "deny", code: first?.code ?? "TOOLCALL_INVALID", reason: first?.message ?? "action invalide" };
  }
  return { kind: "allow" };
}
