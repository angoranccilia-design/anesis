/**
 * Mandate — contrat actif sur une Property. Porte la thèse de souscription et les
 * contraintes de voix de marque (T5). Peut être arrêté d'urgence indépendamment (par mandat).
 */
import type { Iso8601, MandateId, PropertyId, ThesisId } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type MandateState = "active" | "suspended" | "completed" | "terminated";

export const MANDATE_TRANSITIONS: TransitionMap<MandateState> = {
  active: ["suspended", "completed", "terminated"],
  suspended: ["active", "terminated"],
  completed: [],
  terminated: [],
};

/** Contraintes de voix de marque — toute action qui les touche est T5 (approbation bloquante). */
export interface BrandConstraints {
  readonly voiceNotes: string;
  readonly bannedTerms: readonly string[];
}

export interface Mandate {
  readonly id: MandateId;
  readonly propertyId: PropertyId;
  readonly state: MandateState;
  readonly thesisId: ThesisId | null; // attachée via mandate.thesis_attached
  readonly startedAt: Iso8601;
  readonly brandConstraints: BrandConstraints;
  readonly emergencyStopped: boolean; // coupure d'urgence par mandat
}
