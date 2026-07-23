/**
 * Objective — objectif dérivé du plan de récupération. INVARIANT central :
 * un Objective trace TOUJOURS vers une LossLineItem (lossLineId non nullable),
 * donc vers un £ chiffré. L'exécution n'est jamais décidée à la main.
 */
import type { Iso8601, LossLineId, MandateId, Money, ObjectiveId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type ObjectiveState = "created" | "active" | "at_risk" | "achieved" | "abandoned";

export const OBJECTIVE_TRANSITIONS: TransitionMap<ObjectiveState> = {
  created: ["active", "abandoned"],
  active: ["at_risk", "achieved", "abandoned"],
  at_risk: ["active", "achieved", "abandoned"],
  achieved: [],
  abandoned: [],
};

export interface Objective {
  readonly id: ObjectiveId;
  readonly mandateId: MandateId;
  readonly lossLineId: LossLineId; // non nullable — traçabilité vers un £ chiffré
  readonly title: string;
  readonly targetRecovery: Money; // £ à récupérer (dérivé de la loss line)
  readonly state: ObjectiveState;
  readonly createdAt: Iso8601;
}
