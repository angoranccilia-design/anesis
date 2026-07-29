/**
 * Opérateurs humains. Deux rôles :
 *  - `founder`   : seul à pouvoir approuver T3/T4/T5 et déclencher l'arrêt d'urgence GLOBAL.
 *  - `operator`  : annule une retenue T2, révise des artefacts, résout des blockers,
 *                  arrêt d'urgence par MANDAT uniquement.
 * Un seul founder aujourd'hui (Cecilia) ; le modèle permet d'ajouter des operators sans migration.
 */
import type { OperatorId } from "./primitives.js";
import type { AgentId } from "./agent.js";
import type { AutonomyTier } from "./autonomy.js";
import { requiresBlockingApproval } from "./autonomy.js";

export type OperatorRole = "founder" | "operator";

export interface Operator {
  readonly id: OperatorId;
  readonly name: string;
  readonly email: string;
  readonly role: OperatorRole;
}

/**
 * Délégation d'approbation : contexte permettant à un `operator` (non-founder) d'approuver une
 * action bloquante. `supervises` est la liste des agents qu'il encadre (issue de la table
 * `operator_agent_assignments`) ; `agentId` est l'agent dont l'action est à approuver.
 */
export interface ApprovalDelegation {
  readonly agentId: AgentId;
  readonly supervises: readonly AgentId[];
}

/** L'opérateur encadre-t-il l'agent dont l'action est en jeu ? */
export const supervisesAgent = (d: ApprovalDelegation): boolean => d.supervises.includes(d.agentId);

/**
 * Qui peut approuver une action à approbation bloquante (T3/T4/T5).
 *  - niveaux non bloquants (T0/T1/T2) : toujours vrai (rien à approuver) ;
 *  - `founder` : approuve TOUT, sans condition ;
 *  - `operator` : uniquement les agents qu'il supervise explicitement (délégation) — y compris le
 *    T5 de l'`art-director` s'il est assigné comme Directrice Artistique. Sans délégation, un
 *    operator ne peut approuver aucune action bloquante.
 */
export const canApproveTier = (
  op: Operator,
  tier: AutonomyTier,
  delegation?: ApprovalDelegation,
): boolean => {
  if (!requiresBlockingApproval(tier)) return true;
  if (op.role === "founder") return true;
  return delegation != null && supervisesAgent(delegation);
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
