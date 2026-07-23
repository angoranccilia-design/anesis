/**
 * Opérateurs humains. Deux rôles :
 *  - `founder`   : seul à pouvoir approuver T3/T4/T5 et déclencher l'arrêt d'urgence GLOBAL.
 *  - `operator`  : annule une retenue T2, révise des artefacts, résout des blockers,
 *                  arrêt d'urgence par MANDAT uniquement.
 * Un seul founder aujourd'hui (Cecilia) ; le modèle permet d'ajouter des operators sans migration.
 */
import type { OperatorId } from "./primitives.js";
import type { AutonomyTier } from "./autonomy.js";
import { requiresBlockingApproval } from "./autonomy.js";

export type OperatorRole = "founder" | "operator";

export interface Operator {
  readonly id: OperatorId;
  readonly name: string;
  readonly email: string;
  readonly role: OperatorRole;
}

/** Seul le founder approuve une action à approbation bloquante (T3/T4/T5). */
export const canApproveTier = (op: Operator, tier: AutonomyTier): boolean => {
  if (!requiresBlockingApproval(tier)) return true;
  return op.role === "founder";
};

/** Les deux rôles peuvent annuler une action T2 pendant sa fenêtre de retenue. */
export const canCancelRetention = (_op: Operator): boolean => true;

/** Les deux rôles révisent des artefacts et résolvent des blockers. */
export const canReviewArtifact = (_op: Operator): boolean => true;
export const canResolveBlocker = (_op: Operator): boolean => true;

/** Arrêt d'urgence GLOBAL : founder uniquement. */
export const canEmergencyStopGlobal = (op: Operator): boolean => op.role === "founder";

/** Arrêt d'urgence par mandat : les deux rôles. */
export const canEmergencyStopMandate = (_op: Operator): boolean => true;
